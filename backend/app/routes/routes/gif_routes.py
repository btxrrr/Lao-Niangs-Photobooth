import os
import uuid
import tempfile
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app import models

router = APIRouter(tags=["gif"])

MEDIA_DIR = Path("media/gifs")
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

MAX_CLIP_SIZE_MB = 20
REQUIRED_CLIPS   = 4


# ──────────────────────────────────────────────
# POST /clips/stitch
# ──────────────────────────────────────────────

@router.post("/clips/stitch")
async def stitch_clips(
    clips: List[UploadFile] = File(..., description="Exactly 4 WebM video clips"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept 4 short video clips, stitch them into a looping GIF,
    save to disk and return the GIF URL.
    """
    if len(clips) != REQUIRED_CLIPS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Exactly {REQUIRED_CLIPS} clips required, got {len(clips)}",
        )

    max_bytes  = MAX_CLIP_SIZE_MB * 1024 * 1024
    clip_paths = []

    with tempfile.TemporaryDirectory() as tmp:
        # ── Save clips to temp files ──────────────────────────
        for i, clip in enumerate(clips):
            data = await clip.read()
            if len(data) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Clip {i+1} exceeds {MAX_CLIP_SIZE_MB} MB limit",
                )
            if len(data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Clip {i+1} is empty",
                )
            clip_path = os.path.join(tmp, f"clip_{i}.webm")
            with open(clip_path, "wb") as f:
                f.write(data)
            clip_paths.append(clip_path)

        # ── Extract frames + stitch GIF ───────────────────────
        try:
            import av
            from PIL import Image
            import numpy as np

            pil_frames = []

            for clip_path in clip_paths:
                container = av.open(clip_path)
                video_stream = next(
                    (s for s in container.streams if s.type == "video"), None
                )
                if video_stream is None:
                    raise HTTPException(status_code=422, detail=f"No video stream found in clip")

                frame_count = 0
                for packet in container.demux(video_stream):
                    for frame in packet.decode():
                        # Sample every 3rd frame
                        if frame_count % 3 == 0:
                            # Convert to PIL Image
                            img = frame.to_image()
                            # Resize to 480px wide
                            w, h = img.size
                            new_w = 480
                            new_h = int(h * new_w / w)
                            img = img.resize((new_w, new_h), Image.LANCZOS)
                            # Convert to palette mode for GIF
                            pil_frames.append(img.convert("RGB"))
                        frame_count += 1
                container.close()

            if not pil_frames:
                raise HTTPException(status_code=422, detail="No frames extracted from clips")

            # Write looping GIF
            gif_name = f"{uuid.uuid4().hex}.gif"
            gif_path = MEDIA_DIR / gif_name

            pil_frames[0].save(
                str(gif_path),
                format="GIF",
                save_all=True,
                append_images=pil_frames[1:],
                loop=0,           # 0 = loop forever
                duration=80,      # ms per frame (~12 fps)
                optimize=True,
            )

            gif_size = gif_path.stat().st_size
            capture = models.Capture(
                user_id=current_user.id,
                filename=gif_name,
                original_filename=f"laoniangs_flipbook_{uuid.uuid4().hex[:8]}.gif",
                file_path=str(gif_path),
                content_type="image/gif",
                file_size_bytes=gif_size,
                caption=None,
                frame_style=None,
                is_flipbook=True,
                media_type="gif",
            )
            db.add(capture)
            db.commit()
            db.refresh(capture)

        except HTTPException:
            raise
        except ImportError as e:
            raise HTTPException(
                status_code=500,
                detail=f"GIF generation requires: pip install av pillow. Missing: {e}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"GIF generation failed: {str(e)}",
            )

    return {
        "gif_url": f"/captures/{capture.id}/image",
        "capture_id": capture.id,
        "message": "GIF generated successfully",
    }


# ──────────────────────────────────────────────
# GET /media/gifs/{filename}
# ──────────────────────────────────────────────

@router.get("/media/gifs/{filename}")
def serve_gif(
    filename: str,
    current_user: models.User = Depends(get_current_user),
):
    """Serve a generated GIF file."""
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = MEDIA_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="GIF not found")
    return FileResponse(str(path), media_type="image/gif", filename=filename)
