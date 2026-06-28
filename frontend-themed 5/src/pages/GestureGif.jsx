import { useRef, useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Webcam from "react-webcam"
import { useClipRecorder } from "../api/useClipRecorder"
import { useGifExport } from "../api/useGifExport"
import { useGestureDetection } from "../api/useGestureDetection"

const WEBCAM_CONSTRAINTS = {
  width:  { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
}

const CLIP_DURATION_SECONDS = 3

// Status banner shown on the webcam overlay
function StatusBanner({ status }) {
  if (!status || status.type === "idle") return null

  const configs = {
    warning:  { bg: "rgba(220,38,38,0.85)",   icon: "⚠️" },
    tracking: { bg: "rgba(0,0,0,0.5)",         icon: "✋" },
    holding:  { bg: "rgba(244,167,185,0.85)",  icon: "🖐️" },
    cooldown: { bg: "rgba(90,122,150,0.85)",   icon: "⏳" },
    error:    { bg: "rgba(150,0,0,0.9)",       icon: "❌" },
  }

  const cfg = configs[status.type] || configs.tracking

  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      background: cfg.bg, color: "white",
      borderRadius: 50, padding: "8px 20px",
      fontSize: 13, fontFamily: "DM Sans, sans-serif",
      display: "flex", alignItems: "center", gap: 8,
      whiteSpace: "nowrap", backdropFilter: "blur(4px)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
    }}>
      <HandIcon type={status.type} />
      <span>
        {status.type === "holding"
          ? `Hold… ${Math.round((status.progress || 0) * 100)}%`
          : status.type === "cooldown"
          ? "Getting ready…"
          : status.message}
      </span>
    </div>
  )
}

function HandIcon({ type }) {
  const fill = type === "holding" ? "#fff2f5" : "white"
  const stroke = type === "warning" ? "rgba(255,255,255,0.9)" : "white"

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 12V6.5a1.5 1.5 0 0 1 3 0V12m0-1.5V5a1.5 1.5 0 0 1 3 0v5.5m0-.5V6a1.5 1.5 0 0 1 3 0v7m0-1V9a1.5 1.5 0 0 1 3 0v8c0 3.3-2.7 6-6 6h-1.7c-2 0-3.8-1.1-4.7-2.9L5 17.8c-.5-1-.2-2.2.7-2.8.8-.6 1.9-.6 2.7 0l1.6 1.2V10.5a1.5 1.5 0 0 1 3 0v2"
        fill="none"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.1" fill={fill} opacity="0.9" />
    </svg>
  )
}

// Hold progress ring
function HoldRing({ progress }) {
  if (!progress || progress <= 0) return null
  const r = 28
  const circ = 2 * Math.PI * r
  return (
    <div style={{
      position: "absolute", bottom: 56, left: "50%", transform: "translateX(-50%)",
    }}>
      <svg width={64} height={64} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={32} cy={32} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={4} />
        <circle cx={32} cy={32} r={r} fill="none" stroke="white" strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
    </div>
  )
}

export default function GestureGif() {
  const navigate  = useNavigate()
  const webcamRef = useRef(null)
  const videoRef  = useRef(null)
  const countdownRef = useRef(null)

  const [phase, setPhase]             = useState("record")
  const [gestureEnabled, setGestureEnabled] = useState(true)
  const [gestureStatus, setGestureStatus]   = useState(null)
  const [countdown, setCountdown] = useState(null)
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [clipUrls, setClipUrls] = useState([])
  const [previewIndex, setPreviewIndex] = useState(null)
  const [pendingRecordSlot, setPendingRecordSlot] = useState(null)

  const { clips, recording, activeSlot, allFilled, recordSlot, redoSlot, swapClips, resetClips } =
    useClipRecorder({ videoRef })

  const { exporting, gifUrl, error, backendPending, exportGif, reset } = useGifExport()

  useEffect(() => {
    const urls = clips.map((clip) => (clip ? URL.createObjectURL(clip) : null))
    setClipUrls(urls)
    return () => {
      urls.forEach((url) => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [clips])

  useEffect(() => {
    if (!recording) {
      setRecordingTimeLeft(null)
      return
    }

    let secondsLeft = CLIP_DURATION_SECONDS
    setRecordingTimeLeft(secondsLeft)

    const timerId = setInterval(() => {
      secondsLeft -= 1
      if (secondsLeft <= 0) {
        clearInterval(timerId)
        setRecordingTimeLeft(0)
        return
      }

      setRecordingTimeLeft(secondsLeft)
    }, 1000)

    return () => clearInterval(timerId)
  }, [recording])

  // ── Gesture → record next empty slot ──────────────────────
  const handleGestureTrigger = useCallback(() => {
    if (recording || countdown !== null) return
    const nextTarget = pendingRecordSlot !== null
      ? pendingRecordSlot
      : clips.findIndex(c => c === null)
    if (nextTarget === -1) return
    let count = 3
    setCountdown(count)
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      count -= 1
      if (count === 0) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
        setCountdown(null)
        recordSlot(nextTarget)
        setPendingRecordSlot(null)
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [clips, countdown, pendingRecordSlot, recordSlot, recording])

  useGestureDetection({
    enabled:        gestureEnabled && phase === "record" && !recording && countdown === null,
    onTrigger:      handleGestureTrigger,
    videoRef,
    onStatusChange: setGestureStatus,
  })

  const handleUserMedia = useCallback(() => {
    videoRef.current = webcamRef.current?.video
  }, [])

  const handleReview = () => {
    setGestureEnabled(false)
    setPhase("review")
  }

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(null)
  }, [])

  const handleBack = () => {
    clearCountdown()
    setGestureStatus(null)
    setPendingRecordSlot(null)
    if (phase === "export") {
      setPhase("review")
      return
    }
    if (phase === "review") {
      resetClips()
      setGestureEnabled(true)
      setPhase("record")
      return
    }
    navigate("/dashboard")
  }

  const handleExport = async () => {
    setPhase("export")
    await exportGif(clips)
  }

  // Manual button also cancels any running gesture countdown
  const handleManualRecord = () => {
    handleGestureTrigger()
  }

  const handleRedoSingleClip = (index) => {
    clearCountdown()
    redoSlot(index)
    setPendingRecordSlot(index)
    setGestureStatus(null)
    setGestureEnabled(true)
    setPhase("record")
  }

  const handleDragStart = (index) => {
    setDragIndex(index)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
  }

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return
    swapClips(dragIndex, index)
    setDragIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  const handleClipPreview = (index) => {
    if (clips[index]) {
      setPreviewIndex(index)
    }
  }

  const closePreview = () => setPreviewIndex(null)

  const filledCount = clips.filter(Boolean).length
  const nextRecordLabel = pendingRecordSlot !== null
    ? `Re-record clip ${pendingRecordSlot + 1}`
    : "Record next clip"

  return (
    <div className="denim-bg" style={{ minHeight: "100vh", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={handleBack}
          style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer" }}>
          ←
        </button>
        <h1 className="font-script" style={{ fontSize: 28, color: "white" }}>GIF Booth 🎞️</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["record","review","export"].map((s, i) => (
            <div key={s} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: ["record","review","export"].indexOf(phase) >= i
                ? "white" : "rgba(255,255,255,0.3)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "36px auto", padding: "0 24px" }}>

        {/* ══ PHASE: record ══ */}
        {phase === "record" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

            <p className="font-dm" style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center" }}>
              Show an open ✋ palm and hold to start a 3-second countdown for each clip. Or press the button below.
            </p>

            {/* Webcam */}
            <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
              <Webcam
                ref={webcamRef}
                videoConstraints={WEBCAM_CONSTRAINTS}
                style={{ width: "100%", display: "block" }}
                mirrored
                onUserMedia={handleUserMedia}
              />

              {/* Recording pill */}
              {recording && (
                <div style={{
                  position: "absolute", top: 16, left: 16,
                  background: "rgba(220,38,38,0.85)", color: "white",
                  borderRadius: 50, padding: "6px 14px",
                  fontSize: 13, fontFamily: "DM Sans, sans-serif",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 8, height: 8, background: "white", borderRadius: "50%", display: "inline-block" }} />
                  Recording clip {activeSlot + 1} · {recordingTimeLeft ?? CLIP_DURATION_SECONDS}s left
                </div>
              )}

              {/* Hold ring */}
              {gestureStatus?.type === "holding" && (
                <HoldRing progress={gestureStatus.progress} />
              )}

              {/* Status banner */}
              {!recording && <StatusBanner status={gestureStatus} />}

              {countdown !== null && (
                <div style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  background: "rgba(0,0,0,0.24)",
                }}>
                  <div style={{
                    fontSize: 22,
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "DM Sans, sans-serif",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}>
                    Recording starts in
                  </div>
                  <div style={{
                    fontSize: 120,
                    lineHeight: 1,
                    color: "white",
                    fontFamily: "Dancing Script, cursive",
                    textShadow: "0 4px 24px rgba(0,0,0,0.5)",
                  }}>
                    {countdown}
                  </div>
                </div>
              )}
            </div>

            {/* Clip slots */}
            <div style={{ display: "flex", gap: 12, width: "100%", justifyContent: "center" }}>
              {clips.map((clip, i) => (
                <div key={i} style={{
                  flex: 1, maxWidth: 160, aspectRatio: "16/9",
                  borderRadius: 10,
                  border: activeSlot === i
                    ? "2.5px solid #F87171"
                    : clip ? "2.5px solid var(--pink-dark)" : "2px dashed rgba(255,255,255,0.3)",
                  background: clip ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.2)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 4,
                  position: "relative",
                }}>
                  {clip ? (
                    <>
                      <span style={{ fontSize: 22 }}>✅</span>
                      <span style={{ color: "white", fontSize: 11, fontFamily: "DM Sans, sans-serif" }}>Clip {i + 1}</span>
                      <button onClick={() => redoSlot(i)} style={{
                        position: "absolute", top: 4, right: 4,
                        background: "rgba(0,0,0,0.5)", border: "none",
                        color: "white", borderRadius: "50%",
                        width: 20, height: 20, fontSize: 10,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>✕</button>
                    </>
                  ) : activeSlot === i ? (
                    <span style={{ color: "white", fontSize: 11, fontFamily: "DM Sans, sans-serif" }}>Recording…</span>
                  ) : (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }}>+</span>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "DM Sans, sans-serif" }}>Clip {i + 1}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Manual button fallback */}
            <button
              className="btn-primary"
              onClick={handleManualRecord}
              disabled={recording || allFilled}
              style={{ fontSize: 15, padding: "12px 36px" }}
            >
              📷 {nextRecordLabel}
            </button>

            {allFilled && (
              <button className="btn-primary" onClick={handleReview}
                style={{ fontSize: 15, padding: "12px 36px" }}>
                Review clips →
              </button>
            )}
          </div>
        )}

        {/* ══ PHASE: review ══ */}
        {phase === "review" && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 className="font-playfair" style={{ fontSize: 24, color: "var(--text)", marginBottom: 8 }}>
              Review your clips
            </h2>
            <p className="font-dm" style={{ fontSize: 14, color: "var(--text-light)", marginBottom: 24 }}>
              Drag and drop the previews to reorder them. Hit Re-record to start over.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
              {clips.map((clip, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleClipPreview(i)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    cursor: "grab",
                    opacity: dragIndex === i ? 0.55 : 1,
                  }}
                >
                  <div style={{
                    width: 140, aspectRatio: "16/9",
                    background: "var(--cream-dark)", borderRadius: 8,
                    border: dragIndex === i ? "2px dashed var(--pink)" : "2px solid var(--pink)",
                    overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: previewIndex === i ? "0 0 0 3px rgba(244,167,185,0.24)" : "none",
                  }}>
                    {clipUrls[i] ? (
                      <video
                        src={clipUrls[i]}
                        muted
                        playsInline
                        autoPlay
                        loop
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: 28 }}>🎬</span>
                    )}
                  </div>
                  <span className="font-dm" style={{ fontSize: 12, color: "var(--text-light)" }}>Clip {i + 1}</span>
                  <button
                    className="btn-secondary"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRedoSingleClip(i)
                    }}
                    style={{ padding: "8px 14px", fontSize: 12 }}
                  >
                    Re-record this clip
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-secondary" onClick={() => { clearCountdown(); resetClips(); reset(); setPhase("record"); setGestureEnabled(true); setGestureStatus(null) }}>
                ← Re-record
              </button>
              <button className="btn-primary" onClick={handleExport}>
                Export GIF ✨
              </button>
            </div>
          </div>
        )}

        {/* ══ PHASE: export ══ */}
        {phase === "export" && (
          <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>

            {exporting && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                <h3 className="font-playfair" style={{ fontSize: 22, color: "var(--text)" }}>Stitching your GIF…</h3>
              </>
            )}

            {backendPending && !exporting && (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
                <h3 className="font-playfair" style={{ fontSize: 22, color: "var(--text)", marginBottom: 8 }}>
                  Backend coming soon!
                </h3>
                <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 14 }}>
                  All 4 clips recorded successfully. GIF export will work once Bernice's endpoint is live.
                </p>
                <button className="btn-secondary" onClick={() => setPhase("review")} style={{ marginTop: 24 }}>
                  ← Back to review
                </button>
              </>
            )}

            {error && !exporting && (
              <>
                <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "12px 16px", marginBottom: 20, color: "#B91C1C", fontSize: 14 }}>
                  {error}
                </div>
                <button className="btn-secondary" onClick={() => setPhase("review")}>← Back to review</button>
              </>
            )}

            {gifUrl && !exporting && (
              <>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <h3 className="font-playfair" style={{ fontSize: 26, color: "var(--text)", marginBottom: 16 }}>Your GIF is ready!</h3>
                <img src={gifUrl} alt="Your GIF" style={{ maxWidth: "100%", borderRadius: 12, marginBottom: 24, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }} />
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <a href={gifUrl} download="laoniangs.gif" className="btn-primary" style={{ textDecoration: "none" }}>
                    ⬇️ Download GIF
                  </a>
                  <button className="btn-secondary" onClick={() => { reset(); setPhase("record"); setGestureEnabled(true) }}>
                    Make another
                  </button>
                  <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                    Back to gallery
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {previewIndex !== null && clips[previewIndex] && (
          <div
            onClick={closePreview}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10, 12, 20, 0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              zIndex: 60,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(720px, 92vw)",
                background: "rgba(255,255,255,0.96)",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                <span className="font-dm" style={{ color: "var(--text)", fontSize: 14 }}>Clip {previewIndex + 1}</span>
                <button onClick={closePreview} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)" }}>✕</button>
              </div>
              <video
                src={clipUrls[previewIndex]}
                autoPlay
                loop
                controls
                muted
                playsInline
                style={{ width: "100%", display: "block", background: "black" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}