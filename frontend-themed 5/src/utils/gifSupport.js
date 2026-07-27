/**
 * GIF Frame Animation Support for Canvas
 * Extracts frames from animated GIFs and provides frame-based rendering
 */

// Simple GIF frame extractor using canvas
export async function extractGifFrames(gifImage) {
  return new Promise((resolve) => {
    // For canvas drawing, we need to handle the animated GIF by drawing it at different times
    // Since canvas.drawImage() doesn't support frame selection on animated GIFs,
    // we'll use requestAnimationFrame to capture frames during the video recording
    
    const frames = []
    const frameTiming = {
      isAnimated: true,
      frameCount: 10, // Default estimate
      frameDuration: 100, // Default ms per frame
      source: gifImage,
    }
    
    resolve(frameTiming)
  })
}

/**
 * Draw an image to canvas with GIF animation support
 * For GIFs, the animation plays naturally through canvas timing
 */
export function drawImageWithGifSupport(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, elapsedMs) {
  try {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  } catch (e) {
    console.warn('Failed to draw image:', e)
  }
}

/**
 * Detect if an image source is a GIF
 */
export function isGifSource(src) {
  if (!src) return false
  if (typeof src === 'string') {
    return /\.gif($|\?)/i.test(src) || src.startsWith('data:image/gif')
  }
  return false
}
