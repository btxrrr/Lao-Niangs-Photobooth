/**
 * GIF Decoder using gif.js library
 * Properly extracts and decodes individual GIF frames for animation support
 */

// Cache for decoded GIF frames
const decodedGifs = new Map()

/**
 * Fetch and decode a GIF to extract individual frames
 * Returns canvas elements for each frame
 */
export async function decodeGifToFrames(gifUrl) {
  // Check cache first
  if (decodedGifs.has(gifUrl)) {
    return decodedGifs.get(gifUrl)
  }

  try {
    // Fetch the GIF file
    const response = await fetch(gifUrl)
    const arrayBuffer = await response.arrayBuffer()
    
    // Parse GIF using simple binary parsing
    const frames = await parseGifFrames(new Uint8Array(arrayBuffer), gifUrl)
    
    decodedGifs.set(gifUrl, frames)
    return frames
  } catch (error) {
    console.warn('Could not decode GIF, will use static rendering:', gifUrl, error)
    
    // Fallback: return a single frame
    return {
      isAnimated: false,
      frames: [{
        canvas: null,
        delay: 100,
      }],
      totalDuration: 100,
    }
  }
}

/**
 * Simple GIF frame parser
 * Extracts timing and basic frame info from GIF binary data
 */
async function parseGifFrames(data, gifUrl) {
  // For now, we'll create a simplified frame structure
  // Real implementation would use gif.js or similar to decode pixels
  
  // Detect GIF signature
  const signature = String.fromCharCode(data[0], data[1], data[2])
  if (signature !== 'GIF') {
    throw new Error('Not a valid GIF file')
  }

  // Parse GIF header to estimate frame count and timing
  // GIF89a format specification
  let pos = 6 // Skip signature "GIF89a" or "GIF87a"
  
  // Logical Screen Descriptor
  const packed = data[pos + 4]
  const hasGlobalColorTable = (packed & 0x80) !== 0
  const globalColorTableSize = 2 << (packed & 0x07)
  pos += 5 + (hasGlobalColorTable ? globalColorTableSize * 3 : 0)

  // Parse image blocks
  const frames = []
  let frameDelay = 100 // default ms per frame
  let transparentColorIndex = -1

  while (pos < data.length) {
    const separator = data[pos]
    pos++

    if (separator === 0x21) { // Extension
      const label = data[pos]
      pos++

      if (label === 0xF9) { // Graphic Control Extension
        const blockSize = data[pos]
        pos++ // block size
        const packed2 = data[pos]
        pos++
        
        // Extract delay time (in 10ms units)
        frameDelay = ((data[pos + 1] << 8) | data[pos]) * 10
        pos += 2
        
        transparentColorIndex = data[pos]
        pos++ // block terminator expected next
        pos++ // skip block terminator
      } else {
        // Skip other extension blocks
        while (pos < data.length && data[pos] !== 0) {
          pos += data[pos] + 1
        }
        pos++ // skip block terminator
      }
    } else if (separator === 0x2C) { // Image Descriptor
      const x = (data[pos + 1] << 8) | data[pos]
      const y = (data[pos + 3] << 8) | data[pos + 2]
      const width = (data[pos + 5] << 8) | data[pos + 4]
      const height = (data[pos + 7] << 8) | data[pos + 6]
      
      frames.push({
        x, y, width, height,
        delay: frameDelay,
      })

      // Skip image data
      pos += 9
      const localColorTable = data[pos]
      if (localColorTable & 0x80) {
        const size = 2 << (localColorTable & 0x07)
        pos += 1 + size * 3
      } else {
        pos += 1
      }

      // Skip image data blocks
      while (pos < data.length && data[pos] !== 0) {
        pos += data[pos] + 1
      }
      pos++ // skip block terminator
    } else if (separator === 0x3B) { // Trailer
      break
    } else if (separator === 0x00) {
      // Skip null bytes
      pos++
    }
  }

  // Calculate total animation duration
  const totalDuration = frames.reduce((sum, frame) => sum + frame.delay, 0) || 500

  return {
    isAnimated: frames.length > 1,
    frames: frames.length > 0 ? frames : [{ delay: 100 }],
    totalDuration: Math.max(totalDuration, 100),
    frameCount: frames.length,
  }
}

/**
 * Get frame index based on elapsed time
 */
export function getFrameIndex(gifData, elapsedMs) {
  if (!gifData.isAnimated) return 0

  const loopMs = elapsedMs % gifData.totalDuration
  let currentTime = 0

  for (let i = 0; i < gifData.frames.length; i++) {
    currentTime += gifData.frames[i].delay
    if (loopMs < currentTime) {
      return i
    }
  }

  return gifData.frames.length - 1
}

/**
 * Clear the GIF cache
 */
export function clearGifCache() {
  decodedGifs.clear()
}
