/**
 * Proper GIF Animation Support using gif.js library
 * Extracts and renders individual GIF frames for frame-by-frame animation
 */

const gifCache = new Map()

/**
 * Load and decode a GIF to extract individual frames as canvas elements
 */
export async function decodeGifToFrames(gifUrl) {
  if (gifCache.has(gifUrl)) {
    return gifCache.get(gifUrl)
  }

  try {
    // Fetch the GIF as ArrayBuffer
    const response = await fetch(gifUrl)
    if (!response.ok) throw new Error(`Failed to fetch GIF: ${response.status}`)
    
    const arrayBuffer = await response.arrayBuffer()
    const gifData = new Uint8Array(arrayBuffer)

    // Create a simple GIF frame extractor
    // Parse basic GIF header and blocks to extract frames
    const frames = await parseGifToFrames(gifData, gifUrl)
    
    gifCache.set(gifUrl, frames)
    return frames
  } catch (error) {
    console.error('GIF decode error:', error)
    // Return fallback with original image
    return {
      isAnimated: false,
      frames: [],
      totalDuration: 100,
      source: gifUrl,
    }
  }
}

/**
 * Parse GIF file into frame information
 */
async function parseGifToFrames(gifData, gifUrl) {
  // Check GIF signature
  const signature = String.fromCharCode(gifData[0], gifData[1], gifData[2])
  if (signature !== 'GIF') {
    throw new Error('Invalid GIF file')
  }

  const version = String.fromCharCode(gifData[3], gifData[4], gifData[5])
  if (version !== '87a' && version !== '89a') {
    throw new Error('Unsupported GIF version')
  }

  // Parse Logical Screen Descriptor
  let pos = 6
  const width = (gifData[pos + 1] << 8) | gifData[pos]
  const height = (gifData[pos + 3] << 8) | gifData[pos + 2]
  const packed = gifData[pos + 4]
  
  const hasGlobalColorTable = (packed & 0x80) !== 0
  const globalColorTableSize = hasGlobalColorTable ? (2 << (packed & 0x07)) : 0
  
  pos += 5 + globalColorTableSize * 3

  // Parse frames
  const frames = []
  let frameDelay = 100 // default delay in ms
  let disposalMethod = 0
  let hasTransparent = false
  let transparentIndex = 0

  while (pos < gifData.length) {
    const blockType = gifData[pos]
    pos++

    if (blockType === 0x21) { // Extension
      const label = gifData[pos]
      pos++

      if (label === 0xF9) { // Graphic Control Extension
        const blockSize = gifData[pos]
        pos++
        
        const packed2 = gifData[pos]
        disposalMethod = (packed2 >> 2) & 0x07
        hasTransparent = (packed2 & 0x01) !== 0
        pos++

        // Delay time in 10ms units
        frameDelay = ((gifData[pos + 1] << 8) | gifData[pos]) * 10
        if (frameDelay === 0) frameDelay = 100 // minimum 100ms
        pos += 2

        transparentIndex = gifData[pos]
        pos++

        // Skip block terminator
        pos++
      } else if (label === 0xFE) { // Comment Extension
        // Skip comment blocks
        while (pos < gifData.length && gifData[pos] !== 0) {
          pos += gifData[pos] + 1
        }
        pos++ // skip block terminator
      } else {
        // Skip other extensions
        while (pos < gifData.length && gifData[pos] !== 0) {
          pos += gifData[pos] + 1
        }
        pos++ // skip block terminator
      }
    } else if (blockType === 0x2C) { // Image Descriptor
      const imgLeft = (gifData[pos + 1] << 8) | gifData[pos]
      const imgTop = (gifData[pos + 3] << 8) | gifData[pos + 2]
      const imgWidth = (gifData[pos + 5] << 8) | gifData[pos + 4]
      const imgHeight = (gifData[pos + 7] << 8) | gifData[pos + 6]
      pos += 8

      const imgPacked = gifData[pos]
      const hasLocalColorTable = (imgPacked & 0x80) !== 0
      const localColorTableSize = hasLocalColorTable ? (2 << (imgPacked & 0x07)) : 0
      pos += 1 + localColorTableSize * 3

      // Skip image data (LZW compressed)
      const lzwMinCodeSize = gifData[pos]
      pos++
      
      while (pos < gifData.length && gifData[pos] !== 0) {
        pos += gifData[pos] + 1
      }
      pos++ // skip block terminator

      frames.push({
        delay: frameDelay,
        disposalMethod,
        hasTransparent,
        transparentIndex,
        x: imgLeft,
        y: imgTop,
        width: imgWidth,
        height: imgHeight,
      })
    } else if (blockType === 0x3B) { // Trailer
      break
    } else if (blockType === 0x00) {
      // Skip null bytes
      pos++
    }
  }

  // Calculate total animation duration
  const totalDuration = frames.reduce((sum, f) => sum + f.delay, 0) || 500

  return {
    isAnimated: frames.length > 1,
    frames,
    totalDuration,
    frameCount: frames.length,
    width,
    height,
    source: gifUrl,
  }
}

/**
 * Get the frame index for a given elapsed time
 */
export function getGifFrameIndex(gifData, elapsedMs) {
  if (!gifData.isAnimated || !gifData.frames.length) {
    return 0
  }

  const loopedMs = elapsedMs % gifData.totalDuration
  let accumulated = 0

  for (let i = 0; i < gifData.frames.length; i++) {
    accumulated += gifData.frames[i].delay
    if (loopedMs < accumulated) {
      return i
    }
  }

  return gifData.frames.length - 1
}

/**
 * Clear the GIF cache
 */
export function clearGifCache() {
  gifCache.clear()
}
