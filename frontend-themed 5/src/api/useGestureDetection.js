import { useEffect, useRef, useCallback } from "react"
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision"

const HOLD_MS          = 1500
const COOLDOWN_MS      = 4000
const MIN_HAND_SIZE    = 0.08   // too small = too far
const MAX_HAND_SIZE    = 0.55   // too large = too close
const DARK_THRESHOLD   = 45
const BRIGHT_THRESHOLD = 230
const FREEZE_TIMEOUT   = 3000

export function useGestureDetection({ enabled, onTrigger, videoRef, onStatusChange }) {
  const landmarkerRef = useRef(null)
  const cooldownRef   = useRef(false)
  const rafRef        = useRef(null)
  const holdStartRef  = useRef(null)
  const lastFrameRef  = useRef(Date.now())
  const feedStartedRef = useRef(false)
  const canvasRef     = useRef(document.createElement("canvas"))

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        )
        const options = {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          runningMode:                "VIDEO",
          numHands:                   1,
          minHandDetectionConfidence: 0.5,
          minTrackingConfidence:      0.5,
        }

        try {
          const hl = await HandLandmarker.createFromOptions(vision, {
            ...options,
            baseOptions: { ...options.baseOptions, delegate: "GPU" },
          })
          if (!cancelled) landmarkerRef.current = hl
        } catch {
          const hl = await HandLandmarker.createFromOptions(vision, {
            ...options,
            baseOptions: { ...options.baseOptions, delegate: "CPU" },
          })
          if (!cancelled) landmarkerRef.current = hl
        }
      } catch {
        onStatusChange?.({ type: "error", message: "Gesture model failed to load." })
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const checkLighting = useCallback((video) => {
    const canvas = canvasRef.current
    canvas.width = 80; canvas.height = 45
    const ctx = canvas.getContext("2d")
    ctx.drawImage(video, 0, 0, 80, 45)
    const data = ctx.getImageData(0, 0, 80, 45).data
    let total = 0
    for (let i = 0; i < data.length; i += 4) {
      total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }
    const avg = total / (80 * 45)
    if (avg < DARK_THRESHOLD)   return "too_dark"
    if (avg > BRIGHT_THRESHOLD) return "too_bright"
    return "ok"
  }, [])

  const checkDistance = useCallback((landmarks) => {
    const xs   = landmarks.map(l => l.x)
    const ys   = landmarks.map(l => l.y)
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    if (size < MIN_HAND_SIZE) return "too_far"
    if (size > MAX_HAND_SIZE) return "too_close"
    return "ok"
  }, [])

  const isOpenPalm = useCallback((landmarks) => {
    const tips = [8, 12, 16, 20]
    const pips = [6, 10, 14, 18]
    const allExtended  = tips.every((tip, i) => landmarks[tip].y < landmarks[pips[i]].y)
    const wristVisible = landmarks[0].x > 0.02 && landmarks[0].x < 0.98 &&
                         landmarks[0].y > 0.02 && landmarks[0].y < 0.98
    return allExtended && wristVisible
  }, [])

  useEffect(() => {
    if (!enabled) {
      cancelAnimationFrame(rafRef.current)
      holdStartRef.current = null
      feedStartedRef.current = false
      lastFrameRef.current = Date.now()
      onStatusChange?.({ type: "idle" })
      return
    }

    lastFrameRef.current = Date.now()
    feedStartedRef.current = false

    const detect = () => {
      const video = videoRef.current
      const hl    = landmarkerRef.current

      if (feedStartedRef.current && Date.now() - lastFrameRef.current > FREEZE_TIMEOUT) {
        onStatusChange?.({ type: "warning", message: "Camera feed may be frozen." })
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      if (!video || !hl || video.readyState < 2) {
        lastFrameRef.current = Date.now()
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      feedStartedRef.current = true
      lastFrameRef.current = Date.now()

      const lighting = checkLighting(video)
      if (lighting === "too_dark") {
        holdStartRef.current = null
        onStatusChange?.({ type: "warning", message: "Too dark — please improve lighting." })
        rafRef.current = requestAnimationFrame(detect)
        return
      }
      if (lighting === "too_bright") {
        holdStartRef.current = null
        onStatusChange?.({ type: "warning", message: "Too bright — reduce glare." })
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const results = hl.detectForVideo(video, performance.now())
      const hand    = results.landmarks?.[0]

      if (!hand) {
        holdStartRef.current = null
        onStatusChange?.({ type: "idle" })
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const distance = checkDistance(hand)
      if (distance === "too_far") {
        holdStartRef.current = null
        onStatusChange?.({ type: "warning", message: "Hand too far — move closer." })
        rafRef.current = requestAnimationFrame(detect)
        return
      }
      if (distance === "too_close") {
        holdStartRef.current = null
        onStatusChange?.({ type: "warning", message: "Hand too close — move further away." })
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      if (!isOpenPalm(hand)) {
        holdStartRef.current = null
        onStatusChange?.({ type: "tracking", message: "Show open palm to trigger." })
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      if (cooldownRef.current) {
        onStatusChange?.({ type: "cooldown" })
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      if (!holdStartRef.current) holdStartRef.current = Date.now()
      const held     = Date.now() - holdStartRef.current
      const progress = Math.min(held / HOLD_MS, 1)
      onStatusChange?.({ type: "holding", progress })

      if (held >= HOLD_MS) {
        holdStartRef.current = null
        cooldownRef.current  = true
        onTrigger()
        setTimeout(() => { cooldownRef.current = false }, COOLDOWN_MS)
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)
    return () => cancelAnimationFrame(rafRef.current)
  }, [enabled, onTrigger, videoRef, checkLighting, checkDistance, isOpenPalm, onStatusChange])

  const getHoldProgress = useCallback(() => {
    if (!holdStartRef.current) return 0
    return Math.min((Date.now() - holdStartRef.current) / HOLD_MS, 1)
  }, [])

  return { getHoldProgress }
}