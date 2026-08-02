import { useRef, useState, useCallback } from "react"
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

  const [phase, setPhase]             = useState("record")
  const [gestureEnabled, setGestureEnabled] = useState(true)
  const [gestureStatus, setGestureStatus]   = useState(null)

  const { clips, recording, activeSlot, allFilled, recordSlot, redoSlot, swapClips } =
    useClipRecorder({ videoRef })

  const { exporting, gifUrl, error, backendPending, exportGif, reset } = useGifExport()

  // ── Gesture → record next empty slot ──────────────────────
  const handleGestureTrigger = useCallback(() => {
    const nextEmpty = clips.findIndex(c => c === null)
    if (nextEmpty === -1) return
    recordSlot(nextEmpty)
  }, [clips, recordSlot])

  useGestureDetection({
    enabled:        gestureEnabled && phase === "record" && !recording,
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

  const handleExport = async () => {
    setPhase("export")
    await exportGif(clips)
  }

  // Manual button also cancels any running gesture countdown
  const handleManualRecord = () => {
    handleGestureTrigger()
  }

  const filledCount = clips.filter(Boolean).length

  return (
    <div className="denim-bg" style={{ minHeight: "100vh", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => navigate("/dashboard")}
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
              Show an open ✋ palm and hold to record each clip. Or press the button below.
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
                  Recording clip {activeSlot + 1}…
                </div>
              )}

              {/* Hold ring */}
              {gestureStatus?.type === "holding" && (
                <HoldRing progress={gestureStatus.progress} />
              )}

              {/* Status banner */}
              {!recording && <StatusBanner status={gestureStatus} />}
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
              📷 Record next clip
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
              Swap to reorder. Hit ✕ to redo a clip.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
              {clips.map((clip, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 140, aspectRatio: "16/9",
                    background: "var(--cream-dark)", borderRadius: 8,
                    border: "2px solid var(--pink)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                  }}>🎬</div>
                  <span className="font-dm" style={{ fontSize: 12, color: "var(--text-light)" }}>Clip {i + 1}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {i > 0 && (
                      <button onClick={() => swapClips(i, i - 1)}
                        style={{ background: "var(--cream-dark)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>
                        ← Swap
                      </button>
                    )}
                    {i < clips.length - 1 && (
                      <button onClick={() => swapClips(i, i + 1)}
                        style={{ background: "var(--cream-dark)", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>
                        Swap →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn-secondary" onClick={() => { reset(); setPhase("record"); setGestureEnabled(true) }}>
                ← Re-record all
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
      </div>
    </div>
  )
}