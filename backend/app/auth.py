from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

import bcrypt
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()


# ──────────────────────────────────────────────
# Password hashing  (bcrypt directly — bypasses passlib/bcrypt version conflict)
# ──────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ──────────────────────────────────────────────
# JWT
# ──────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload["exp"] = expire
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


# ──────────────────────────────────────────────
# Password-reset tokens  (simple random hex, stored in DB)
# ──────────────────────────────────────────────

def generate_reset_token() -> str:
    """Returns a 64-character URL-safe hex token."""
    return secrets.token_hex(32)


def reset_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        minutes=settings.reset_token_expire_minutes
    )
