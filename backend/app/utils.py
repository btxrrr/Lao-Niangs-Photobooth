import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

settings = get_settings()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def validate_image_file(file: UploadFile) -> None:
    """Raise 400 if file is not an allowed image type or exceeds size limit."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {ALLOWED_IMAGE_TYPES}",
        )


async def save_upload(file: UploadFile, sub_dir: str = "") -> tuple[str, str, int]:
    """
    Save an uploaded file to disk under UPLOAD_DIR/sub_dir.

    Returns:
        (stored_filename, relative_file_path, file_size_bytes)
    """
    upload_root = Path(settings.upload_dir)
    dest_dir = upload_root / sub_dir
    dest_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = dest_dir / stored_name

    max_bytes = settings.max_file_size_mb * 1024 * 1024

    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_file_size_mb} MB limit",
        )

    dest_path.write_bytes(content)
    total = len(content)

    relative_path = str(dest_dir / stored_name)
    return stored_name, relative_path, total


def delete_file(file_path: str) -> None:
    """Best-effort delete of a stored file — does not raise if missing."""
    try:
        os.remove(file_path)
    except FileNotFoundError:
        pass
