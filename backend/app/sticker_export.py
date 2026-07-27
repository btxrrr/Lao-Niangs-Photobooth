from __future__ import annotations

import json
import os
import re
import tempfile
import zipfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterable

import httpx
from fastapi import HTTPException, status
from PIL import Image, ImageOps, ImageSequence

from app.config import get_settings


settings = get_settings()
STICKER_SIZE = 512


@dataclass
class StickerSource:
    capture_id: int
    name: str
    media_type: str
    content_type: str | None
    file_path: str
    caption: str | None = None


def slugify(text: str, fallback: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (text or fallback or "sticker").strip().lower())
    return base.strip("-") or fallback


def is_animated(source: StickerSource) -> bool:
    content_type = (source.content_type or "").lower()
    return source.media_type == "gif" or "gif" in content_type or source.file_path.lower().endswith(".gif")


def _fit_frame(frame: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (STICKER_SIZE, STICKER_SIZE), (0, 0, 0, 0))
    fitted = ImageOps.contain(frame.convert("RGBA"), (STICKER_SIZE - 48, STICKER_SIZE - 48), Image.LANCZOS)
    x = (STICKER_SIZE - fitted.width) // 2
    y = (STICKER_SIZE - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def _encode_static_webp(source: StickerSource) -> bytes:
    with Image.open(source.file_path) as image:
        framed = _fit_frame(image)
        output = BytesIO()
        framed.save(output, format="WEBP", lossless=True, method=6, quality=100)
        return output.getvalue()


def _encode_video_webm(source: StickerSource) -> bytes:
    with Image.open(source.file_path) as image:
        frames = [_fit_frame(frame) for frame in ImageSequence.Iterator(image)]
        if not frames:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Animated sticker has no frames")

    try:
        import av
    except ImportError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Animated sticker export requires av: {exc}")

    with tempfile.TemporaryDirectory() as tmp_dir:
        output_path = Path(tmp_dir) / "sticker.webm"
        output = av.open(str(output_path), mode="w", format="webm")
        stream = output.add_stream("libvpx-vp9", rate=12)
        stream.width = STICKER_SIZE
        stream.height = STICKER_SIZE
        stream.pix_fmt = "yuv420p"

        for frame in frames:
            video_frame = av.VideoFrame.from_image(frame)
            for packet in stream.encode(video_frame):
                output.mux(packet)

        for packet in stream.encode():
            output.mux(packet)
        output.close()
        return output_path.read_bytes()


def build_whatsapp_zip(sources: Iterable[StickerSource]) -> tuple[str, bytes]:
    sources = list(sources)
    zip_buffer = BytesIO()
    manifest = []

    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for index, source in enumerate(sources, start=1):
            slug = slugify(source.caption or source.name, f"sticker-{source.capture_id}")
            if is_animated(source):
                file_name = f"{index:02d}-{slug}.webm"
                archive.writestr(file_name, _encode_video_webm(source))
                mime_type = "video/webm"
            else:
                file_name = f"{index:02d}-{slug}.webp"
                archive.writestr(file_name, _encode_static_webp(source))
                mime_type = "image/webp"

            manifest.append({"file": file_name, "mime_type": mime_type, "caption": source.caption or source.name})

        archive.writestr(
            "manifest.json",
            json.dumps(
                {
                    "platform": "whatsapp",
                    "sticker_size": STICKER_SIZE,
                    "items": manifest,
                },
                indent=2,
            ),
        )

    pack_name = f"sticker-pack-{os.urandom(6).hex()}"
    return pack_name, zip_buffer.getvalue()


def is_telegram_configured() -> bool:
    return bool(settings.telegram_bot_token and settings.telegram_bot_username)


async def publish_telegram_sticker_pack(owner_user_id: int, title: str, sources: Iterable[StickerSource]) -> dict:
    sources = list(sources)
    if not sources:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one sticker")
    if len(sources) > 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Telegram sticker packs support up to 50 stickers")

    normalized_title = title.strip()[:64] or "Sticker Pack"
    pack_prefix = re.sub(r"[^a-z0-9_]+", "_", normalized_title.strip().lower())
    pack_prefix = re.sub(r"_+", "_", pack_prefix).strip("_") or "stickers"
    if not pack_prefix[0].isalpha():
        pack_prefix = f"s_{pack_prefix}"
    sticker_set_name = f"{pack_prefix}_{os.urandom(4).hex()}_by_{settings.telegram_bot_username.lower()}"
    sticker_set_name = re.sub(r"_+", "_", sticker_set_name).strip("_")[:64]

    async with httpx.AsyncClient(timeout=60.0) as client:
        sticker_specs = []
        for index, source in enumerate(sources):
            sticker_bytes = _encode_video_webm(source) if is_animated(source) else _encode_static_webp(source)
            sticker_format = "video" if is_animated(source) else "static"
            upload_name = f"sticker_{index}"
            extension = "webm" if sticker_format == "video" else "webp"
            mime_type = "video/webm" if sticker_format == "video" else "image/webp"

            upload_response = await client.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/uploadStickerFile",
                data={"user_id": str(owner_user_id)},
                files={upload_name: (f"{upload_name}.{extension}", sticker_bytes, mime_type)},
            )
            upload_payload = upload_response.json()
            if not upload_payload.get("ok"):
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Telegram upload failed: {upload_payload.get('description', 'unknown error')}")

            sticker_specs.append(
                {
                    "sticker": upload_payload["result"]["file_id"],
                    "format": sticker_format,
                    "emoji_list": [((source.caption or "😀").strip()[:1] or "😀")],
                    "keywords": [slugify(source.caption or source.name, "sticker")],
                }
            )

        create_response = await client.post(
            f"https://api.telegram.org/bot{settings.telegram_bot_token}/createNewStickerSet",
            data={
                "user_id": str(owner_user_id),
                "name": sticker_set_name,
                "title": normalized_title,
                "stickers": json.dumps(sticker_specs),
                "sticker_type": "regular",
            },
        )
        create_payload = create_response.json()
        if not create_payload.get("ok"):
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Telegram pack creation failed: {create_payload.get('description', 'unknown error')}")

    return {
        "sticker_set_name": sticker_set_name,
        "sticker_set_url": f"https://t.me/addstickers/{sticker_set_name}",
    }