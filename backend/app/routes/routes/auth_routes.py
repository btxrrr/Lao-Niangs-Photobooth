import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app import models, schemas
from app.auth import hash_password, verify_password, create_access_token, generate_reset_token, reset_token_expiry
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address, enabled=os.getenv("DISABLE_RATE_LIMIT") != "1")


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = models.User(
        email=payload.email, username=payload.username,
        hashed_password=hash_password(payload.password),
    )
    db.add(user); db.commit(); db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    token = create_access_token({"sub": str(user.id)})
    return schemas.TokenResponse(access_token=token, user=schemas.UserOut.model_validate(user))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/logout", response_model=schemas.MessageResponse)
def logout(_: models.User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.post("/request-password-reset", response_model=schemas.MessageResponse)
@limiter.limit("5/minute")
def request_password_reset(request: Request, payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user:
        user.reset_token         = generate_reset_token()
        user.reset_token_expires = reset_token_expiry()
        db.commit()
        print(f"[DEV] Password reset token for {user.email}: {user.reset_token}")
        print(f"[DEV] Reset URL: http://localhost:5173/reset-password?token={user.reset_token}")
    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=schemas.MessageResponse)
def reset_password(payload: schemas.PasswordReset, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.reset_token == payload.token).first()
    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expires = user.reset_token_expires
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")
    user.hashed_password    = hash_password(payload.new_password)
    user.reset_token        = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password reset successfully"}
