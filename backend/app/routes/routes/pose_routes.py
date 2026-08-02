from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.routes.utils import validate_image_file, save_upload, delete_file

router = APIRouter(prefix="/poses", tags=["poses"])

VALID_SHOT_TYPES = {"single", "duo", "trio", "quad"}


def pose_ref_to_out(ref: models.PoseReference) -> schemas.PoseReferenceOut:
    return schemas.PoseReferenceOut(
        id=ref.id,
        user_id=ref.user_id,
        name=ref.name,
        shot_type=ref.shot_type,
        original_filename=ref.original_filename,
        content_type=ref.content_type,
        created_at=ref.created_at,
    )


# ──────────────────────────────────────────────
# Custom Pose References — Pose Assistant
#
# Lets a user upload their own reference image (any art style — anime,
# a plain outline sketch, an actual photo, whatever they like) instead
# of relying on the built-in procedural stick-figure poses. Saved with
# a name + shot type so it reappears in the Pose Assistant library for
# that shot type on future visits.
# ──────────────────────────────────────────────

@router.post("/", response_model=schemas.PoseReferenceOut, status_code=201)
async def create_pose_reference(
    file: UploadFile = File(...),
    name: str = Form(..., min_length=1, max_length=60),
    shot_type: str = Form("single"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if shot_type not in VALID_SHOT_TYPES:
        raise HTTPException(status_code=422, detail=f"shot_type must be one of {sorted(VALID_SHOT_TYPES)}")
    validate_image_file(file)
    stored_name, file_path, file_size = await save_upload(file, sub_dir=f"poses/{current_user.id}")
    ref = models.PoseReference(
        user_id=current_user.id, name=name.strip(), shot_type=shot_type,
        filename=stored_name, original_filename=file.filename,
        file_path=file_path, content_type=file.content_type, file_size_bytes=file_size,
    )
    db.add(ref); db.commit(); db.refresh(ref)
    return pose_ref_to_out(ref)


@router.get("/", response_model=list[schemas.PoseReferenceOut])
def list_pose_references(
    shot_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.PoseReference).filter(models.PoseReference.user_id == current_user.id)
    if shot_type:
        query = query.filter(models.PoseReference.shot_type == shot_type)
    refs = query.order_by(models.PoseReference.created_at.desc()).all()
    return [pose_ref_to_out(r) for r in refs]


@router.get("/{pose_id}/image")
def get_pose_reference_image(pose_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ref = db.query(models.PoseReference).filter(models.PoseReference.id == pose_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Pose reference not found")
    if ref.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if not os.path.exists(ref.file_path):
        raise HTTPException(status_code=404, detail="Image file missing from storage")
    return FileResponse(ref.file_path, media_type=ref.content_type or "image/jpeg", filename=ref.original_filename or ref.filename)


@router.delete("/{pose_id}", response_model=schemas.MessageResponse)
def delete_pose_reference(pose_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ref = db.query(models.PoseReference).filter(models.PoseReference.id == pose_id).first()
    if not ref:
        raise HTTPException(status_code=404, detail="Pose reference not found")
    if ref.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    delete_file(ref.file_path)
    db.delete(ref); db.commit()
    return {"message": f"Pose reference {pose_id} deleted"}
