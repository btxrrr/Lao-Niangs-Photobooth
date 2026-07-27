import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import Webcam from "react-webcam"
import { useCapture } from "../api/useCapture"

const WEBCAM_CONSTRAINTS = {
  width:  { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
}

const POSE_LIBRARY = [
  { id: "solo-wave", label: "Solo Wave", groupSize: "single", theme: "playful", modeHint: "library", accent: "#f59e0b", overlay: "wave" },
  { id: "solo-frame", label: "Frame It", groupSize: "single", theme: "classic", modeHint: "library", accent: "#ec4899", overlay: "frame" },
  { id: "solo-peace", label: "Peace Sign", groupSize: "single", theme: "playful", modeHint: "roulette", accent: "#14b8a6", overlay: "peace" },
  { id: "solo-cheek", label: "Cute Lean", groupSize: "single", theme: "romantic", modeHint: "library", accent: "#fb7185", overlay: "lean" },
  { id: "couple-heart", label: "Heart Hands", groupSize: "couple", theme: "romantic", modeHint: "roulette", accent: "#f472b6", overlay: "heart" },
  { id: "couple-cheers", label: "Cheers Together", groupSize: "couple", theme: "party", modeHint: "library", accent: "#a855f7", overlay: "cheers" },
  { id: "couple-lean", label: "Side by Side", groupSize: "couple", theme: "classic", modeHint: "library", accent: "#0ea5e9", overlay: "side" },
  { id: "group-triangle", label: "Triangle Pose", groupSize: "group", theme: "classic", modeHint: "roulette", accent: "#22c55e", overlay: "triangle" },
  { id: "group-arms-up", label: "Arms Up", groupSize: "group", theme: "party", modeHint: "library", accent: "#eab308", overlay: "arms" },
  { id: "group-stack", label: "Stack Up", groupSize: "group", theme: "playful", modeHint: "roulette", accent: "#fb7185", overlay: "stack" },
]

const GROUP_OPTIONS = [
  { key: "single", label: "Single" },
  { key: "couple", label: "Couple" },
  { key: "group", label: "Group" },
]

const THEME_OPTIONS = [
  { key: "all", label: "All themes" },
  { key: "classic", label: "Classic" },
  { key: "playful", label: "Playful" },
  { key: "romantic", label: "Romantic" },
  { key: "party", label: "Party" },
]

const MODE_OPTIONS = [
  { key: "library", label: "Pose Library Mode", description: "Pick a pose manually from the grid." },
  { key: "roulette", label: "Pose Roulette Mode", description: "Filter the set, then click Feeling Lucky." },
]

function getPoseModeLabel(groupSize) {
  return GROUP_OPTIONS.find((option) => option.key === groupSize)?.label || groupSize
}

function getThemeLabel(theme) {
  return THEME_OPTIONS.find((option) => option.key === theme)?.label || theme
}

function pickRandomPose(poses) {
  if (!poses.length) return null
  return poses[Math.floor(Math.random() * poses.length)]
}

function PosePreview({ pose }) {
  const commonStroke = pose?.accent || "#f8fafc"
  const overlayKey = pose?.overlay || "wave"

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <filter id="pose-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>
      <g
        stroke={commonStroke}
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.9"
        filter="url(#pose-shadow)"
      >
        {overlayKey === "wave" && (
          <>
            <circle cx="34" cy="28" r="6" />
            <path d="M34 34v22" />
            <path d="M34 42c-8 2-12 8-12 16" />
            <path d="M34 42c10 0 16 4 18 12" />
            <path d="M56 18c6 2 10 6 10 12" />
            <path d="M56 22v18" />
            <path d="M52 24c2-4 7-6 12-6" />
          </>
        )}
        {overlayKey === "frame" && (
          <>
            <rect x="22" y="18" width="56" height="64" rx="8" />
            <path d="M22 34h56" />
            <path d="M34 34v26" />
            <path d="M66 34v26" />
            <circle cx="50" cy="54" r="7" />
          </>
        )}
        {overlayKey === "peace" && (
          <>
            <circle cx="36" cy="28" r="6" />
            <path d="M36 34v22" />
            <path d="M36 42c-8 2-12 8-12 16" />
            <path d="M36 40c4-6 8-10 12-10" />
            <path d="M54 28c6 0 10 3 10 9" />
            <path d="M54 34v20" />
            <path d="M54 38l8-12" />
            <path d="M58 40l8-12" />
          </>
        )}
        {overlayKey === "lean" && (
          <>
            <circle cx="38" cy="30" r="6" />
            <path d="M38 36c-4 6-6 14-6 22" />
            <path d="M38 42c8 0 14 4 20 12" />
            <path d="M58 28c6 2 10 8 10 16" />
            <path d="M58 36v22" />
            <path d="M54 48c-2 4-5 7-10 9" />
          </>
        )}
        {overlayKey === "heart" && (
          <>
            <circle cx="33" cy="30" r="6" />
            <path d="M33 36v20" />
            <path d="M33 42c-7 3-10 9-10 15" />
            <circle cx="67" cy="30" r="6" />
            <path d="M67 36v20" />
            <path d="M67 42c7 3 10 9 10 15" />
            <path d="M44 36c3-8 9-12 16-12s13 4 16 12" />
            <path d="M50 51l-4-4a4 4 0 0 1 6-5l2 2 2-2a4 4 0 0 1 6 5l-4 4" />
          </>
        )}
        {overlayKey === "cheers" && (
          <>
            <circle cx="32" cy="30" r="6" />
            <path d="M32 36v18" />
            <path d="M32 44c6 0 11 4 14 10" />
            <circle cx="68" cy="30" r="6" />
            <path d="M68 36v18" />
            <path d="M68 44c-6 0-11 4-14 10" />
            <path d="M44 46h12" />
            <path d="M50 34v12" />
          </>
        )}
        {overlayKey === "side" && (
          <>
            <circle cx="32" cy="29" r="6" />
            <path d="M32 35v24" />
            <path d="M44 29h18" />
            <circle cx="68" cy="29" r="6" />
            <path d="M68 35v24" />
            <path d="M56 29h-18" />
            <path d="M40 54c6 4 14 4 20 0" />
          </>
        )}
        {overlayKey === "triangle" && (
          <>
            <circle cx="50" cy="22" r="6" />
            <path d="M50 28v18" />
            <path d="M36 50c4-10 10-14 14-14" />
            <path d="M64 50c-4-10-10-14-14-14" />
            <circle cx="30" cy="54" r="6" />
            <path d="M30 60v12" />
            <circle cx="70" cy="54" r="6" />
            <path d="M70 60v12" />
            <path d="M42 68h16" />
          </>
        )}
        {overlayKey === "arms" && (
          <>
            <circle cx="50" cy="18" r="6" />
            <path d="M50 24v18" />
            <path d="M50 28l-12-12" />
            <path d="M50 28l12-12" />
            <circle cx="28" cy="56" r="6" />
            <path d="M28 62v14" />
            <circle cx="72" cy="56" r="6" />
            <path d="M72 62v14" />
            <path d="M42 54h16" />
          </>
        )}
        {overlayKey === "stack" && (
          <>
            <circle cx="50" cy="18" r="6" />
            <path d="M50 24v16" />
            <circle cx="38" cy="46" r="6" />
            <path d="M38 52v14" />
            <circle cx="62" cy="46" r="6" />
            <path d="M62 52v14" />
            <path d="M44 28c-4 6-8 10-12 12" />
            <path d="M56 28c4 6 8 10 12 12" />
            <path d="M42 62h16" />
          </>
        )}
      </g>
    </svg>
  )
}

function PoseCard({ pose, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pose)}
      style={{
        border: selected ? `2px solid ${pose.accent}` : "1px solid rgba(255,255,255,0.18)",
        background: selected ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 14,
        color: "white",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: selected ? `0 12px 28px ${pose.accent}33` : "none",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 16, overflow: "hidden", background: "rgba(15,23,42,0.35)", marginBottom: 12 }}>
        <div style={{ position: "absolute", inset: 0, padding: 12 }}>
          <PosePreview pose={pose} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{pose.label}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{getPoseModeLabel(pose.groupSize)} · {getThemeLabel(pose.theme)}</div>
        </div>
        <div style={{ fontSize: 11, borderRadius: 999, padding: "4px 8px", background: `${pose.accent}22`, color: pose.accent, whiteSpace: "nowrap" }}>
          {pose.modeHint === "roulette" ? "Lucky pick" : "Library"}
        </div>
      </div>
    </button>
  )
}

function PoseOverlay({ pose }) {
  if (!pose) return null
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: "10% 8%", border: `3px solid ${pose.accent}cc`, borderRadius: 28, boxShadow: `0 0 0 1px rgba(255,255,255,0.12) inset, 0 0 0 999px rgba(0,0,0,0.02) inset` }} />
      <div style={{ position: "absolute", inset: "14% 14% 14% 14%", opacity: 0.92 }}>
        <PosePreview pose={pose} />
      </div>
      <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.45)", color: "white", borderRadius: 999, padding: "8px 12px", fontSize: 12, backdropFilter: "blur(8px)" }}>
        {pose.label}
      </div>
    </div>
  )
}

function ReadyRing({ progress }) {
  if (!progress || progress <= 0) return null
  const r = 28
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
      <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={4} />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke="white"
          strokeWidth={4}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - progress)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>
    </div>
  )
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
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const { capture } = useCapture()
  const countdownRef = useRef(null)

  const [phase, setPhase] = useState("preview")
  const [screenshot, setScreenshot] = useState(null)
  const [caption, setCaption] = useState("")
  const [frameStyle, setFrameStyle] = useState("")
  const [savedId, setSavedId] = useState(null)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(null)
  const [poseMode, setPoseMode] = useState("library")
  const [groupSize, setGroupSize] = useState("single")
  const [theme, setTheme] = useState("all")
  const [selectedPose, setSelectedPose] = useState(null)

  const filteredPoses = useMemo(() => {
    return POSE_LIBRARY.filter((pose) => {
      if (pose.groupSize !== groupSize) return false
      if (theme !== "all" && pose.theme !== theme) return false
      return true
    })
  }, [groupSize, theme])

  const resetCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  useEffect(() => () => resetCountdown(), [resetCountdown])

  useEffect(() => {
    if (selectedPose && !filteredPoses.some((pose) => pose.id === selectedPose.id)) {
      setSelectedPose(null)
    }
  }, [filteredPoses, selectedPose])

  const startCountdown = useCallback(() => {
    if (countdown !== null) return
    let count = 3
    setCountdown(count)
    resetCountdown()
    countdownRef.current = setInterval(() => {
      count -= 1
      if (count === 0) {
        resetCountdown()
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
  }, [countdown, resetCountdown])

  const handleUserMedia = useCallback(() => {
  }, [])

  const handleRetake = () => {
    setScreenshot(null)
    setCaption("")
    setFrameStyle("")
    setError("")
    setPhase("preview")
  }

  const handleClearPose = useCallback(() => {
    setSelectedPose(null)
  }, [])

  const handleGroupChange = useCallback((nextGroupSize) => {
    setGroupSize(nextGroupSize)
    setSelectedPose(null)
  }, [])

  const handleThemeChange = useCallback((nextTheme) => {
    setTheme(nextTheme)
    setSelectedPose(null)
  }, [])

  const handleLuckyPick = useCallback(() => {
    const pool = filteredPoses.filter((pose) => pose.modeHint !== "library")
    const choice = pickRandomPose(pool.length ? pool : filteredPoses)
    if (choice) {
      setSelectedPose(choice)
      setPoseMode("roulette")
    }
  }, [filteredPoses])

  const handlePoseSelect = useCallback((pose) => {
    setSelectedPose(pose)
    setPoseMode("library")
  }, [])

  const handleReady = useCallback(() => {
    if (!selectedPose || countdown !== null) return
    startCountdown()
  }, [countdown, selectedPose, startCountdown])

  const handleSave = async () => {
    setPhase("saving")
    setError("")
    try {
      const result = await capture(screenshot, caption, frameStyle, selectedPose)
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
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
                <div>
                  <h2 className="font-playfair" style={{ fontSize: 26, color: "var(--text)", marginBottom: 8 }}>
                    Pick a pose first
                  </h2>
                  <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 14, maxWidth: 520 }}>
                    Choose a group size, select a pose manually, or let Feeling Lucky pick from the filtered set.
                  </p>
                </div>
                <div style={{ minWidth: 180, padding: "10px 14px", borderRadius: 18, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(244,167,185,0.22)" }}>
                  <div className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 4 }}>Current filter</div>
                  <div className="font-dm" style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    {getPoseModeLabel(groupSize)} · {getThemeLabel(theme)}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <div className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                    Pose Library Mode / Pose Roulette Mode
                  </div>
                  <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                    {MODE_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setPoseMode(option.key)}
                        style={{
                          borderRadius: 18,
                          padding: 16,
                          textAlign: "left",
                          border: poseMode === option.key ? "1.5px solid var(--pink-dark)" : "1px solid rgba(244,167,185,0.28)",
                          background: poseMode === option.key ? "var(--pink-light)" : "white",
                          cursor: "pointer",
                        }}
                      >
                        <div className="font-dm" style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                          {option.label}
                        </div>
                        <div className="font-dm" style={{ fontSize: 13, color: "var(--text-light)" }}>
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                    1. Select group size
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {GROUP_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleGroupChange(option.key)}
                        style={{
                          padding: "9px 14px",
                          borderRadius: 999,
                          border: groupSize === option.key ? "1.5px solid var(--pink-dark)" : "1px solid rgba(244,167,185,0.3)",
                          background: groupSize === option.key ? "var(--pink-light)" : "white",
                          color: groupSize === option.key ? "var(--pink-dark)" : "var(--text-light)",
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 13,
                          cursor: "pointer",
                          fontWeight: groupSize === option.key ? 700 : 400,
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                    2. Filter by theme
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleThemeChange(option.key)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: theme === option.key ? "1.5px solid var(--pink-dark)" : "1px solid rgba(244,167,185,0.3)",
                          background: theme === option.key ? "var(--pink-light)" : "white",
                          color: theme === option.key ? "var(--pink-dark)" : "var(--text-light)",
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 13,
                          cursor: "pointer",
                          fontWeight: theme === option.key ? 700 : 400,
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {poseMode === "roulette" && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(244,167,185,0.18)" }}>
                    <div>
                      <div className="font-dm" style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                        Feeling Lucky uses the filtered set
                      </div>
                      <div className="font-dm" style={{ fontSize: 13, color: "var(--text-light)" }}>
                        {filteredPoses.length} matching pose{filteredPoses.length === 1 ? "" : "s"} available.
                      </div>
                    </div>
                    <button className="btn-secondary" type="button" onClick={handleLuckyPick} disabled={!filteredPoses.length}>
                      Feeling Lucky
                    </button>
                  </div>
                )}

                <div>
                  <div className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                    3. Pick a pose from the grid
                  </div>
                  <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    {filteredPoses.map((pose) => (
                      <PoseCard key={pose.id} pose={pose} selected={selectedPose?.id === pose.id} onSelect={handlePoseSelect} />
                    ))}
                  </div>
                  {!filteredPoses.length && (
                    <div style={{ marginTop: 14, padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.75)", color: "var(--text-light)", fontSize: 14 }}>
                      No poses match this filter yet. Change the group size or theme.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.3)" }}>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={WEBCAM_CONSTRAINTS}
                style={{ width: "100%", display: "block" }}
                mirrored
                onUserMedia={handleUserMedia}
              />

              <PoseOverlay pose={selectedPose} />

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

              {countdown !== null && <ReadyRing progress={countdown / 3} />}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
              <div className="font-dm" style={{ color: "var(--text-light)", fontSize: 13 }}>
                {selectedPose ? `Ready for ${selectedPose.label}.` : "Choose a pose to continue."}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-secondary" type="button" onClick={handleClearPose} disabled={!selectedPose}>
                  Clear pose
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleReady}
                  disabled={!selectedPose || countdown !== null}
                  style={{ fontSize: 17, padding: "14px 48px", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 22 }}>✨</span>
                  {countdown !== null ? `Get ready… ${countdown}` : "Ready"}
                </button>
              </div>
            </div>
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

            {selectedPose && (
              <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 14, background: "rgba(244,167,185,0.12)", color: "var(--text)", fontSize: 14 }}>
                Pose: <strong>{selectedPose.label}</strong> · {getPoseModeLabel(selectedPose.groupSize)} · {getThemeLabel(selectedPose.theme)}
              </div>
            )}

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