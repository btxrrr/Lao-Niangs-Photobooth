from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.routes.utils import validate_image_file, save_upload, delete_file

router = APIRouter(prefix="/captures", tags=["captures"])


def capture_to_out(capture: models.Capture) -> schemas.CaptureOut:
    return schemas.CaptureOut(
        id=capture.id,
        user_id=capture.user_id,
        filename=capture.filename,
        original_filename=capture.original_filename,
        content_type=capture.content_type,
        file_size_bytes=capture.file_size_bytes,
        caption=capture.caption,
        frame_style=capture.frame_style,
        is_flipbook=bool(capture.is_flipbook),
        media_type=capture.media_type or "photo",
        created_at=capture.created_at,
    )


@router.post("/", response_model=schemas.CaptureOut, status_code=201)
async def create_capture(
    file: UploadFile = File(...),
    caption:     Optional[str] = Form(None, max_length=500),
    frame_style: Optional[str] = Form(None, max_length=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    validate_image_file(file)
    stored_name, file_path, file_size = await save_upload(file, sub_dir=str(current_user.id))
    capture = models.Capture(
        user_id=current_user.id, filename=stored_name,
        original_filename=file.filename, file_path=file_path,
        content_type=file.content_type, file_size_bytes=file_size,
        caption=caption, frame_style=frame_style,
    )
    db.add(capture); db.commit(); db.refresh(capture)
    return capture_to_out(capture)


@router.get("/", response_model=list[schemas.CaptureOut])
def list_captures(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    captures = db.query(models.Capture).filter(models.Capture.user_id == current_user.id).order_by(models.Capture.created_at.desc()).all()
    return [capture_to_out(capture) for capture in captures]


@router.get("/{capture_id}", response_model=schemas.CaptureOut)
def get_capture(capture_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    capture = db.query(models.Capture).filter(models.Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    if capture.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return capture_to_out(capture)


@router.get("/{capture_id}/image")
def get_capture_image(capture_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    capture = db.query(models.Capture).filter(models.Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    if capture.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(capture.file_path):
        raise HTTPException(status_code=404, detail="Image file missing from storage")
    return FileResponse(capture.file_path, media_type=capture.content_type or "image/jpeg", filename=capture.original_filename or capture.filename)


@router.delete("/{capture_id}", response_model=schemas.MessageResponse)
def delete_capture(capture_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    capture = db.query(models.Capture).filter(models.Capture.id == capture_id).first()
    if not capture:
        raise HTTPException(status_code=404, detail="Capture not found")
    if capture.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    delete_file(capture.file_path)
    db.delete(capture); db.commit()
    return {"message": f"Capture {capture_id} deleted"}
