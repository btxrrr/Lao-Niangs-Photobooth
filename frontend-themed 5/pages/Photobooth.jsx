import { useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Webcam from "react-webcam"
import { useCapture } from "../api/useCapture"
import { useGestureDetection } from "../api/useGestureDetection"

const WEBCAM_CONSTRAINTS = {
  width:  { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
}

function StatusBanner({ status }) {
  if (!status || status.type === "idle") return null
  const configs = {
    warning:  { bg: "rgba(220,38,38,0.85)",  icon: "⚠️" },
    tracking: { bg: "rgba(0,0,0,0.5)",        icon: "✋" },
    holding:  { bg: "rgba(244,167,185,0.85)", icon: "🖐️" },
    cooldown: { bg: "rgba(90,122,150,0.85)",  icon: "⏳" },
    error:    { bg: "rgba(150,0,0,0.9)",      icon: "❌" },
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
      <span>{cfg.icon}</span>
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

export default function Photobooth() {
  const navigate  = useNavigate()
  const webcamRef = useRef(null)
  const videoRef  = useRef(null)
  const { capture } = useCapture()

  const [phase, setPhase]           = useState("preview")
  const [screenshot, setScreenshot] = useState(null)
  const [caption,    setCaption]    = useState("")
  const [frameStyle, setFrameStyle] = useState("")
  const [savedId,    setSavedId]    = useState(null)
  const [error,      setError]      = useState("")
  const [countdown,  setCountdown]  = useState(null)
  const [gestureStatus, setGestureStatus] = useState(null)

  // ── Countdown + capture ────────────────────────────────────
  const startCountdown = useCallback(() => {
    // If countdown already running, ignore (manual button pressed during gesture countdown)
    if (countdown !== null) return
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count -= 1
      if (count === 0) {
        clearInterval(interval)
        setCountdown(null)
        const img = webcamRef.current?.getScreenshot()
        if (img) {
          setScreenshot(img)
          setPhase("confirm")
        }
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [countdown])

  // ── Gesture trigger → start countdown ─────────────────────
  const handleGestureTrigger = useCallback(() => {
    if (phase === "preview" && countdown === null) {
      startCountdown()
    }
  }, [phase, countdown, startCountdown])

  useGestureDetection({
    enabled:        phase === "preview" && countdown === null,
    onTrigger:      handleGestureTrigger,
    videoRef,
    onStatusChange: setGestureStatus,
  })

  const handleUserMedia = useCallback(() => {
    videoRef.current = webcamRef.current?.video
  }, [])

  const handleRetake = () => {
    setScreenshot(null)
    setCaption("")
    setFrameStyle("")
    setError("")
    setPhase("preview")
  }

  const handleSave = async () => {
    setPhase("saving")
    setError("")
    try {
      const result = await capture(screenshot, caption, frameStyle)
      setSavedId(result.id)
      setPhase("saved")
    } catch (err) {
      const msg = err.response?.data?.detail || "Could not save photo. Please try again."
      setError(msg)
      setPhase("confirm")
    }
  }

  return (
    <div className="denim-bg" style={{ minHeight: "100vh", padding: "0 0 60px" }}>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>
          ←
        </button>
        <h1 className="font-script" style={{ fontSize: 28, color: "white" }}>Photo Booth 📸</h1>
      </div>

      <div style={{ maxWidth: 700, margin: "40px auto", padding: "0 24px" }}>

        {/* ══ PHASE: preview ══ */}
        {phase === "preview" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

            <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={WEBCAM_CONSTRAINTS}
                style={{ width: "100%", display: "block" }}
                mirrored
                onUserMedia={handleUserMedia}
              />

              {/* Countdown overlay */}
              {countdown !== null && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,0,0,0.35)",
                }}>
                  <span style={{
                    fontSize: 120, fontFamily: "Dancing Script, cursive",
                    color: "white", textShadow: "0 4px 20px rgba(0,0,0,0.5)", lineHeight: 1,
                  }}>
                    {countdown}
                  </span>
                </div>
              )}

              {/* Hold ring */}
              {gestureStatus?.type === "holding" && countdown === null && (
                <HoldRing progress={gestureStatus.progress} />
              )}

              {/* Status banner */}
              {countdown === null && <StatusBanner status={gestureStatus} />}
            </div>

            <button
              className="btn-primary"
              onClick={startCountdown}
              disabled={countdown !== null}
              style={{ fontSize: 17, padding: "14px 48px", display: "flex", alignItems: "center", gap: 10 }}
            >
              <span style={{ fontSize: 22 }}>📷</span>
              {countdown !== null ? `Get ready… ${countdown}` : "Take Photo"}
            </button>

            <p className="font-dm" style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              Show an open palm ✋ to trigger, or press the button above
            </p>
          </div>
        )}

        {/* ══ PHASE: confirm ══ */}
        {phase === "confirm" && screenshot && (
          <div className="glass-card" style={{ padding: 32 }}>
            <h2 className="font-playfair" style={{ fontSize: 24, color: "var(--text)", marginBottom: 6 }}>
              Looking good? ✨
            </h2>
            <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 14, marginBottom: 24 }}>
              Add a caption and frame style, then save.
            </p>

            {error && (
              <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "10px 16px", marginBottom: 20, color: "#B91C1C", fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto" }}>
                <div className="polaroid" style={{ width: 200, "--rot": "-2deg" }}>
                  <img src={screenshot} alt="Your capture" style={{ width: "100%", display: "block", borderRadius: 2 }} />
                  {caption && (
                    <p className="font-script" style={{ fontSize: 14, textAlign: "center", marginTop: 6, color: "var(--text)" }}>
                      {caption}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="font-dm" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
                    Caption <span style={{ fontWeight: 400, color: "var(--text-light)" }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="A memory to remember..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="font-dm" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", display: "block", marginBottom: 6 }}>
                    Frame style <span style={{ fontWeight: 400, color: "var(--text-light)" }}>(optional)</span>
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["", "retro", "festive", "minimal", "dreamy"].map((style) => (
                      <button
                        key={style}
                        onClick={() => setFrameStyle(style)}
                        style={{
                          padding: "6px 14px", borderRadius: 50, border: "1.5px solid",
                          borderColor: frameStyle === style ? "var(--pink-dark)" : "rgba(244,167,185,0.35)",
                          background: frameStyle === style ? "var(--pink-light)" : "white",
                          color: frameStyle === style ? "var(--pink-dark)" : "var(--text-light)",
                          fontSize: 13, fontFamily: "DM Sans, sans-serif",
                          cursor: "pointer", fontWeight: frameStyle === style ? 600 : 400, transition: "all 0.2s",
                        }}
                      >
                        {style === "" ? "None" : style.charAt(0).toUpperCase() + style.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn-secondary" onClick={handleRetake} style={{ flex: 1 }}>Retake</button>
                  <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>Save Photo 💾</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ PHASE: saving ══ */}
        {phase === "saving" && (
          <div className="glass-card" style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h3 className="font-playfair" style={{ fontSize: 22, color: "var(--text)" }}>Saving your memory...</h3>
          </div>
        )}

        {/* ══ PHASE: saved ══ */}
        {phase === "saved" && (
          <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }} className="float">🎉</div>
            <h3 className="font-playfair" style={{ fontSize: 26, color: "var(--text)", marginBottom: 8 }}>Photo saved!</h3>
            <p className="font-dm" style={{ color: "var(--text-light)", marginBottom: 32, fontSize: 14 }}>
              Capture #{savedId} is in your gallery.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn-secondary" onClick={handleRetake}>📷 Take another</button>
              <button className="btn-primary" onClick={() => navigate("/dashboard")}>🖼️ View gallery</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}