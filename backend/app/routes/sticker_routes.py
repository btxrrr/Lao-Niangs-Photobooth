from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.dependencies import get_current_user
from app.sticker_export import StickerSource, build_whatsapp_zip, is_telegram_configured, publish_telegram_sticker_pack


router = APIRouter(prefix="/stickers", tags=["stickers"])


class StickerExportRequest(BaseModel):
    platform: Literal["whatsapp", "telegram"]
    title: str = Field(min_length=1, max_length=64)
    capture_ids: list[int] = Field(min_length=1)
    telegram_owner_user_id: int | None = Field(default=None, gt=0)
    telegram_username: str | None = Field(default=None)


class StickerExportResponse(BaseModel):
    platform: str
    title: str
    message: str
    artifact_url: str | None = None
    download_name: str | None = None
    telegram_sticker_set_name: str | None = None
    telegram_sticker_set_url: str | None = None


def _load_sources(db: Session, current_user: models.User, capture_ids: list[int]) -> list[StickerSource]:
    captures = (
        db.query(models.Capture)
        .filter(models.Capture.user_id == current_user.id)
        .filter(models.Capture.id.in_(capture_ids))
        .all()
    )
    by_id = {capture.id: capture for capture in captures}
    missing = [capture_id for capture_id in capture_ids if capture_id not in by_id]
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Missing captures: {', '.join(map(str, missing))}")

    return [
        StickerSource(
            capture_id=capture.id,
            name=Path(capture.original_filename or capture.filename).stem,
            media_type=capture.media_type,
            content_type=capture.content_type,
            file_path=capture.file_path,
            caption=capture.caption,
        )
        for capture in captures
    ]


@router.post("/export", response_model=StickerExportResponse)
async def export_stickers(
    payload: StickerExportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sources = _load_sources(db, current_user, payload.capture_ids)

    if payload.platform == "whatsapp":
        pack_name, zip_bytes = build_whatsapp_zip(sources)
        export_dir = Path("media/sticker-packs") / str(current_user.id)
        export_dir.mkdir(parents=True, exist_ok=True)
        zip_path = export_dir / f"{pack_name}.zip"
        zip_path.write_bytes(zip_bytes)

        return StickerExportResponse(
            platform="whatsapp",
            title=payload.title,
            message="Sticker pack ZIP created successfully",
            artifact_url=f"/stickers/artifacts/{current_user.id}/{zip_path.name}",
            download_name=zip_path.name,
        )

    if not is_telegram_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot credentials are not configured",
        )

    # Determine owner user ID - use provided ID or default to current user
    owner_user_id = payload.telegram_owner_user_id or current_user.id
    telegram_username = payload.telegram_username
    
    telegram_result = await publish_telegram_sticker_pack(owner_user_id, payload.title, sources, telegram_username)
    return StickerExportResponse(
        platform="telegram",
        title=payload.title,
        message="Telegram sticker pack published successfully",
        telegram_sticker_set_name=telegram_result["sticker_set_name"],
        telegram_sticker_set_url=telegram_result["sticker_set_url"],
    )


@router.get("/artifacts/{user_id}/{filename}")
def download_artifact(
    user_id: int,
    filename: str,
    current_user: models.User = Depends(get_current_user),
):
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    path = Path("media/sticker-packs") / str(user_id) / filename
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact not found")

    return FileResponse(str(path), media_type="application/zip", filename=filename)