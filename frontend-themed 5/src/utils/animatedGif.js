/**
 * Animated GIF decoding for canvas export.
 *
 * The Smart Frame Studio export renders the whole composition onto a
 * <canvas> (either as a still PNG, or frame-by-frame into a recorded
 * video when a GIF is present). `ctx.drawImage()` only ever paints
 * whatever the *current* decoded frame of an <img> happens to be —
 * it does not "play" the GIF. Relying on the browser to keep an
 * off-screen <img> animating and hoping drawImage() catches a moving
 * frame is unreliable: browsers are free to pause/throttle animation
 * on images that aren't actually being painted on screen, which is
 * exactly what made exported GIFs come out static.
 *
 * Instead, we decode every frame of the GIF ourselves (via gifuct-js)
 * into its own fully-composited canvas up front, then during export
 * we pick the right frame for the current timestamp — completely
 * independent of whatever the browser decides to do with any <img>.
 */
import { parseGIF, decompressFrames } from "gifuct-js"

export function isAnimatedGifSrc(src) {
  return typeof src === "string" && (/\.gif($|\?)/i.test(src) || src.startsWith("data:image/gif"))
}

const decodeCache = new Map()

async function fetchArrayBuffer(src) {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Failed to fetch GIF (${res.status})`)
  return res.arrayBuffer()
}

/**
 * Decode a GIF (data URL, blob URL, or regular URL) into a list of
 * ready-to-draw canvas frames plus their individual delays.
 *
 * Returns: { kind: "gif", width, height, frames: [{ canvas, delay }], totalDuration }
 */
export async function decodeAnimatedGif(src) {
  if (decodeCache.has(src)) return decodeCache.get(src)

  const promise = (async () => {
    const buffer = await fetchArrayBuffer(src)
    const gif = parseGIF(buffer)
    const rawFrames = decompressFrames(gif, true)

    const width = gif.lsd.width
    const height = gif.lsd.height

    // Frames are composited onto a shared canvas that persists between
    // frames (GIFs only encode the *changed* region per frame), then
    // snapshotted into their own canvas so each frame can be drawn
    // independently later regardless of decode order.
    const composite = document.createElement("canvas")
    composite.width = width
    composite.height = height
    const compositeCtx = composite.getContext("2d")

    const patchCanvas = document.createElement("canvas")
    const patchCtx = patchCanvas.getContext("2d")

    const frames = rawFrames.map((frame) => {
      const { dims, patch, disposalType } = frame

      patchCanvas.width = dims.width
      patchCanvas.height = dims.height
      const imageData = patchCtx.createImageData(dims.width, dims.height)
      imageData.data.set(patch)
      patchCtx.putImageData(imageData, 0, 0)

      compositeCtx.drawImage(patchCanvas, dims.left, dims.top)

      const frameCanvas = document.createElement("canvas")
      frameCanvas.width = width
      frameCanvas.height = height
      frameCanvas.getContext("2d").drawImage(composite, 0, 0)

      // Disposal method 2 = "restore to background" (clear the region
      // this frame drew before compositing the next one). Method 3
      // ("restore to previous") is rare in practice; we approximate it
      // the same way, which is correct for the vast majority of GIFs.
      if (disposalType === 2 || disposalType === 3) {
        compositeCtx.clearRect(dims.left, dims.top, dims.width, dims.height)
      }

      return { canvas: frameCanvas, delay: Math.max(frame.delay || 0, 20) }
    })

    const totalDuration = frames.reduce((sum, f) => sum + f.delay, 0) || 100

    return { kind: "gif", width, height, frames, totalDuration }
  })()

  decodeCache.set(src, promise)
  try {
    return await promise
  } catch (err) {
    decodeCache.delete(src)
    throw err
  }
}

/**
 * Pick the canvas for whichever frame should be showing at `elapsedMs`
 * into the loop.
 */
export function gifFrameAt(gifEntry, elapsedMs) {
  if (!gifEntry?.frames?.length) return null
  const loopMs = gifEntry.totalDuration > 0 ? elapsedMs % gifEntry.totalDuration : 0
  let acc = 0
  for (const frame of gifEntry.frames) {
    acc += frame.delay
    if (loopMs < acc) return frame.canvas
  }
  return gifEntry.frames[gifEntry.frames.length - 1].canvas
}
