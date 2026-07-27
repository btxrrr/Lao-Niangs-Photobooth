import { useState, useMemo, useEffect } from "react"
import {
  POSE_TYPES, getPosesByType, getRandomPose,
  GROUP_SIZE_MIN, GROUP_SIZE_MAX, GROUP_SIZE_DEFAULT, clampGroupSize,
} from "../data/poses"
import PoseSilhouette from "./PoseSilhouette"

// ─────────────────────────────────────────────────────────────
// PoseLibraryModal — Feature 6: Pose Assistant
//
// Two interaction modes live here:
//   • Pose Library Mode  — pick a shot type (for Group, also enter
//                           how many people), browse filtered poses,
//                           tap one to select it.
//   • Pose Roulette Mode — "Feeling Lucky" instantly picks a random
//                           pose from the same filtered list.
//
// Poses are filtered (and, for Group, generated) according to the
// selected shot type / group size, so a suggested pose always fits
// the number of people actually in the shot.
//
// onSelect(pose | null) is called when the user confirms a pose or
// explicitly skips ("No pose, thanks").
// ─────────────────────────────────────────────────────────────
export default function PoseLibraryModal({ onSelect, onClose }) {
  const [shotType, setShotType] = useState("single")
  const [groupSize, setGroupSize] = useState(GROUP_SIZE_DEFAULT)

  // Reset the group-size stepper to a sane default whenever the
  // user leaves Group mode and comes back.
  useEffect(() => {
    if (shotType !== "group") setGroupSize(GROUP_SIZE_DEFAULT)
  }, [shotType])

  const poses = useMemo(
    () => getPosesByType(shotType, groupSize),
    [shotType, groupSize]
  )

  const adjustGroupSize = (delta) => {
    setGroupSize((n) => clampGroupSize(n + delta))
  }

  const handleLucky = () => {
    const pose = getRandomPose(shotType, groupSize)
    if (pose) onSelect(pose)
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(61,52,80,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", padding: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 className="font-playfair" style={{ fontSize: 24, color: "var(--text)" }}>Pose Assistant 🕺</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-light)" }}>✕</button>
        </div>
        <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", marginBottom: 20 }}>
          Pick a shot type, then browse poses or let us surprise you.
        </p>

        {/* Shot type selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: shotType === "group" ? 16 : 20 }}>
          {POSE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setShotType(t.id)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 14,
                border: "1.5px solid",
                borderColor: shotType === t.id ? "var(--pink-dark)" : "rgba(244,167,185,0.35)",
                background: shotType === t.id ? "var(--pink-light)" : "white",
                color: shotType === t.id ? "var(--pink-dark)" : "var(--text-light)",
                fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 13,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 2 }}>{t.emoji}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Group size stepper — only shown for Group shots */}
        {shotType === "group" && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
            marginBottom: 20, background: "var(--cream-dark)", borderRadius: 14, padding: "10px 16px",
          }}>
            <span className="font-dm" style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>
              How many people?
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => adjustGroupSize(-1)}
                disabled={groupSize <= GROUP_SIZE_MIN}
                style={stepperBtnStyle}
              >−</button>
              <span className="font-playfair" style={{ fontSize: 18, color: "var(--text)", minWidth: 22, textAlign: "center" }}>
                {groupSize}
              </span>
              <button
                onClick={() => adjustGroupSize(1)}
                disabled={groupSize >= GROUP_SIZE_MAX}
                style={stepperBtnStyle}
              >+</button>
            </div>
          </div>
        )}

        {/* Feeling Lucky */}
        <button
          className="btn-primary"
          onClick={handleLucky}
          style={{ width: "100%", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          🎲 Feeling Lucky — surprise me
        </button>

        {/* Pose grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
          {poses.map((pose) => (
            <button
              key={pose.id}
              onClick={() => onSelect(pose)}
              style={{
                background: "var(--denim)", borderRadius: 14, border: "2px solid transparent",
                padding: 0, cursor: "pointer", overflow: "hidden", transition: "border-color 0.2s",
                display: "flex", flexDirection: "column",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--pink)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            >
              <div style={{ aspectRatio: "16 / 9", padding: 10 }}>
                <PoseSilhouette pose={pose} opacity={0.95} />
              </div>
              <div style={{ background: "white", padding: "8px 10px" }}>
                <p className="font-dm" style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{pose.label}</p>
                <p className="font-dm" style={{ fontSize: 10.5, color: "var(--text-light)", marginTop: 2 }}>{pose.tip}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          className="btn-secondary"
          onClick={() => onSelect(null)}
          style={{ width: "100%", marginTop: 20, fontSize: 13 }}
        >
          No pose, thanks — just take the photo
        </button>
      </div>
    </div>
  )
}

const stepperBtnStyle = {
  width: 28, height: 28, borderRadius: "50%",
  border: "1.5px solid var(--pink-dark)", background: "white", color: "var(--pink-dark)",
  fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  lineHeight: 1,
}
