/**
 * WebM → MP4 conversion for Smart Frame Studio exports.
 *
 * `MediaRecorder` can only reliably produce WebM in the browser — asking
 * it for `video/mp4` directly produces broken/unplayable files on most
 * browsers (that's why the recorder itself always records WebM). To give
 * users a real, working .mp4 download, we transcode the recorded WebM to
 * MP4 (H.264) client-side with ffmpeg.wasm after recording finishes.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"

const CORE_VERSION = "0.12.6"
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

let ffmpegPromise = null

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      console.log("[webmToMp4] creating FFmpeg instance…")
      const ffmpeg = new FFmpeg()
      ffmpeg.on("log", ({ type, message }) => console.log(`[ffmpeg:${type}]`, message))

      // Load the engine straight from the CDN URL rather than converting it
      // to a blob: URL first — Safari's worker implementation fails to
      // import ffmpeg-core.js when it's handed a blob: URL, even though
      // Chrome tolerates it fine. Fetching it directly (unpkg sends proper
      // CORS headers) works the same in both.
      console.log("[webmToMp4] calling ffmpeg.load()…")
      await ffmpeg.load({
        coreURL: `${CORE_BASE_URL}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE_URL}/ffmpeg-core.wasm`,
      })
      console.log("[webmToMp4] ffmpeg.load() resolved — engine ready")
      return ffmpeg
    })().catch((err) => {
      console.error("[webmToMp4] engine load failed:", err)
      ffmpegPromise = null // allow retry on next call instead of caching a rejected load
      throw err
    })
  }
  return ffmpegPromise
}

/**
 * Convert a recorded WebM video Blob into an MP4 Blob.
 *
 * `onProgress` (optional) is called with a 0–1 value as ffmpeg transcodes.
 * `onLoadStart` (optional) is called once, only the very first time this
 * runs in a session, right before the ~25MB ffmpeg engine starts
 * downloading — useful for showing a distinct "loading engine" message
 * instead of leaving the UI looking stuck during that (often slower)
 * one-time download.
 */
export async function convertWebmToMp4(webmBlob, { onProgress, onLoadStart } = {}) {
  if (!ffmpegPromise) onLoadStart?.()
  const ffmpeg = await getFFmpeg()

  const progressHandler = ({ progress }) => {
    if (typeof progress === "number" && Number.isFinite(progress)) {
      onProgress?.(Math.min(Math.max(progress, 0), 1))
    }
  }
  ffmpeg.on("progress", progressHandler)

  const inputName = `in-${Date.now()}.webm`
  const outputName = `out-${Date.now()}.mp4`

  try {
    console.log("[webmToMp4] writing input file to ffmpeg FS…", webmBlob.size, "bytes")
    await ffmpeg.writeFile(inputName, await fetchFile(webmBlob))
    console.log("[webmToMp4] input written, starting ffmpeg.exec()…")
    await ffmpeg.exec([
      "-i", inputName,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      outputName,
    ])
    console.log("[webmToMp4] exec() finished, reading output file…")
    const data = await ffmpeg.readFile(outputName)
    console.log("[webmToMp4] done —", data.length, "bytes")
    return new Blob([data.buffer], { type: "video/mp4" })
  } finally {
    ffmpeg.off("progress", progressHandler)
    await ffmpeg.deleteFile(inputName).catch(() => {})
    await ffmpeg.deleteFile(outputName).catch(() => {})
  }
}
