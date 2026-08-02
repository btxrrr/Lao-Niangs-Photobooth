import os
import uuid
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from app.config import get_settings

settings = get_settings()
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def validate_image_file(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'",
        )


async def save_upload(file: UploadFile, sub_dir: str = "") -> tuple[str, str, int]:
    upload_root = Path(settings.upload_dir)
    dest_dir    = upload_root / sub_dir
    dest_dir.mkdir(parents=True, exist_ok=True)

    ext         = Path(file.filename or "image.jpg").suffix or ".jpg"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest_path   = dest_dir / stored_name
    max_bytes   = settings.max_file_size_mb * 1024 * 1024

    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_file_size_mb} MB limit",
        )

    dest_path.write_bytes(content)
    return stored_name, str(dest_dir / stored_name), len(content)


def delete_file(file_path: str) -> None:
    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
