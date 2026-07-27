import { useRef, useState, useCallback } from "react"
import fixWebmDuration from "fix-webm-duration"

const CLIP_DURATION_MS = 3000   // each clip is 3 seconds
const MIN_CLIP_MS      = 1500   // reject clips shorter than this

export function useClipRecorder({ videoRef }) {
  const [clips, setClips]   = useState([null, null, null, null])  // 4 slots
  const [recording, setRecording] = useState(false)
  const [activeSlot, setActiveSlot] = useState(null)
  const mediaRecRef = useRef(null)
  const chunksRef   = useRef([])
  const startTimeRef = useRef(null)

  // ── Record one clip into a slot ────────────────────────────
  const recordSlot = useCallback((slotIndex) => {
    const stream = videoRef.current?.srcObject
    if (!stream || recording) return

    setRecording(true)
    setActiveSlot(slotIndex)
    chunksRef.current = []
    startTimeRef.current = Date.now()

    const mr = new MediaRecorder(stream, { mimeType: "video/webm" })
    mediaRecRef.current = mr

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    mr.onstop = async () => {
      const duration = Date.now() - startTimeRef.current
      if (duration < MIN_CLIP_MS) {
        // Too short — reject
        setRecording(false)
        setActiveSlot(null)
        return
      }
      const rawBlob = new Blob(chunksRef.current, { type: "video/webm" })

      // MediaRecorder writes WebM files with no Duration/Cues metadata,
      // so <video> elements playing straight from the blob report
      // duration === Infinity and can get stuck rendering only the very
      // first frame instead of actually playing. Patch that metadata in
      // using the known recording duration so every clip preview (and
      // the exported GIF) reflects its own real motion.
      let blob = rawBlob
      try {
        blob = await fixWebmDuration(rawBlob, duration, { logger: false })
      } catch (err) {
        console.warn("Could not patch WebM duration metadata:", err)
      }

      setClips((prev) => {
        const next = [...prev]
        next[slotIndex] = blob
        return next
      })
      setRecording(false)
      setActiveSlot(null)
    }

    mr.start()
    setTimeout(() => {
      if (mr.state === "recording") mr.stop()
    }, CLIP_DURATION_MS)
  }, [videoRef, recording])

  // ── Redo a specific slot ───────────────────────────────────
  const redoSlot = useCallback((slotIndex) => {
    setClips((prev) => {
      const next = [...prev]
      next[slotIndex] = null
      return next
    })
  }, [])

  const resetClips = useCallback(() => {
    if (mediaRecRef.current?.state === "recording") {
      mediaRecRef.current.stop()
    }
    chunksRef.current = []
    startTimeRef.current = null
    setClips([null, null, null, null])
    setRecording(false)
    setActiveSlot(null)
  }, [])

  // ── Reorder clips (drag or swap) ──────────────────────────
  const swapClips = useCallback((indexA, indexB) => {
    setClips((prev) => {
      const next = [...prev]
      ;[next[indexA], next[indexB]] = [next[indexB], next[indexA]]
      return next
    })
  }, [])

  const allFilled = clips.every(Boolean)

  return { clips, recording, activeSlot, allFilled, recordSlot, redoSlot, swapClips, resetClips }
}