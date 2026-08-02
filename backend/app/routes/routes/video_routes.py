import os
import uuid
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from app.dependencies import get_current_user
from app import models

router = APIRouter(tags=["video"])

MAX_VIDEO_SIZE_MB = 60
TMP_DIR = tempfile.gettempdir()


# ──────────────────────────────────────────────
# POST /clips/convert-mp4
#
# The browser can only reliably *record* WebM (MediaRecorder doesn't
# produce valid MP4 in most browsers, and in-browser WASM transcoding
# via ffmpeg.wasm is unreliable on Safari — its worker fails to load the
# engine there). So Smart Frame Studio uploads its recorded WebM export
# here, and we transcode it to a real MP4 with server-side ffmpeg (via
# PyAV, already a dependency for GIF stitching). This works the same in
# every browser since the browser is just uploading/downloading bytes.
# ──────────────────────────────────────────────

@router.post("/clips/convert-mp4")
async def convert_webm_to_mp4(
    video: UploadFile = File(..., description="A WebM video clip to convert to MP4"),
    current_user: models.User = Depends(get_current_user),
):
    max_bytes = MAX_VIDEO_SIZE_MB * 1024 * 1024
    data = await video.read()

    if len(data) == 0:
        raise HTTPException(status_code=422, detail="Uploaded video is empty")
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"Video exceeds {MAX_VIDEO_SIZE_MB} MB limit")

    input_path = os.path.join(TMP_DIR, f"laoniangs_in_{uuid.uuid4().hex}.webm")
    output_path = os.path.join(TMP_DIR, f"laoniangs_out_{uuid.uuid4().hex}.mp4")

    with open(input_path, "wb") as f:
        f.write(data)

    try:
        _transcode_to_mp4(input_path, output_path)
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"MP4 conversion requires: pip install av. Missing: {e}",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MP4 conversion failed: {str(e)}")
    finally:
        try:
            os.remove(input_path)
        except OSError:
            pass

    if not os.path.exists(output_path):
        raise HTTPException(status_code=500, detail="MP4 conversion produced no output")

    def _cleanup():
        try:
            os.remove(output_path)
        except OSError:
            pass

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename="smart-frame.mp4",
        background=BackgroundTask(_cleanup),
    )


def _transcode_to_mp4(input_path: str, output_path: str) -> None:
    import av

    input_container = av.open(input_path)
    try:
        in_stream = next((s for s in input_container.streams if s.type == "video"), None)
        if in_stream is None:
            raise HTTPException(status_code=422, detail="No video stream found in upload")

        fps = in_stream.average_rate or 30
        output_container = av.open(output_path, mode="w", options={"movflags": "faststart"})
        try:
            out_stream = output_container.add_stream("libx264", rate=fps)
            out_stream.width = in_stream.codec_context.width
            out_stream.height = in_stream.codec_context.height
            out_stream.pix_fmt = "yuv420p"
            out_stream.options = {"preset": "veryfast", "crf": "23"}

            for packet in input_container.demux(in_stream):
                for frame in packet.decode():
                    for out_packet in out_stream.encode(frame):
                        output_container.mux(out_packet)

            # flush any frames still buffered inside the encoder
            for out_packet in out_stream.encode():
                output_container.mux(out_packet)
        finally:
            output_container.close()
    finally:
        input_container.close()
