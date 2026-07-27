// ─────────────────────────────────────────────────────────────
// PoseSilhouette — renders a pose (one or more stick-figure actors)
// as a lightweight inline SVG. Used both as small thumbnails in the
// pose library grid and as the big semi-transparent overlay shown
// on top of the live webcam preview.
//
// The internal canvas is widescreen (matches the webcam's ~16:9
// frame) rather than square. Each actor's x position is still
// authored as a 0–100 "percentage of frame width" in data/poses.js,
// so poses.js never needs to know about the real aspect ratio — it
// gets remapped onto the wide canvas here. That's what keeps a
// group pose spread across the *actual* width people will stand in,
// instead of being squeezed into a square letterboxed in the middle
// of a landscape video, which is what made the overlay feel
// misaligned with real bodies before.
// ─────────────────────────────────────────────────────────────

const VIEWBOX_W = 178   // ≈ 16:9 when paired with VIEWBOX_H
const VIEWBOX_H = 100

function armTarget(side, variant, s) {
  // side: 1 for right arm, -1 for left arm (mirrored)
  const sign = side
  switch (variant) {
    case "up":        return { x: sign * 9 * s,  y: -24 * s }
    case "out":        return { x: sign * 20 * s, y: -2 * s }
    case "hip":        return { x: sign * 8 * s,  y: 11 * s }
    case "wave":       return { x: sign * 15 * s, y: -20 * s }
    case "peace":      return { x: sign * 7 * s,  y: -22 * s }
    case "heartL":     return { x: -3 * s,        y: 7 * s }
    case "heartR":     return { x: 3 * s,         y: 7 * s }
    case "shoulderL":  return { x: -20 * s,       y: -7 * s }
    case "shoulderR":  return { x: 20 * s,        y: -7 * s }
    case "down":
    default:           return { x: sign * 10 * s, y: 22 * s }
  }
}

function legTargets(variant, s) {
  switch (variant) {
    case "apart": return [{ x: -15 * s, y: 27 * s }, { x: 15 * s, y: 27 * s }]
    case "cross": return [{ x: 5 * s, y: 26 * s }, { x: -3 * s, y: 26 * s }]
    case "kick":  return [{ x: -17 * s, y: 13 * s }, { x: 17 * s, y: 15 * s }]
    case "sit":   return [{ x: -11 * s, y: 15 * s }, { x: 11 * s, y: 15 * s }]
    case "stand":
    default:      return [{ x: -6 * s, y: 27 * s }, { x: 6 * s, y: 27 * s }]
  }
}

function Actor({ x, y, scale, armL, armR, legs, headTilt = 0, color = "#FFFFFF" }) {
  const s = scale
  // `x` arrives as a 0–100 percentage of frame width — remap it onto
  // the actual (wider) viewBox so spacing matches the real frame.
  const cx = (x / 100) * VIEWBOX_W
  const cy = y

  const shoulderY = cy - 22 * s
  const headY = shoulderY - 10 * s
  const headR = 6 * s

  const lArm = armTarget(-1, armL, s)
  const rArm = armTarget(1, armR, s)
  const [lLeg, rLeg] = legTargets(legs, s)

  const strokeW = Math.max(2.4, 4.2 * s)

  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {/* legs */}
      <line x1={cx} y1={cy} x2={cx + lLeg.x} y2={cy + lLeg.y} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + rLeg.x} y2={cy + rLeg.y} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* torso */}
      <line x1={cx} y1={shoulderY} x2={cx} y2={cy} stroke={color} strokeWidth={strokeW * 1.35} strokeLinecap="round" />
      {/* arms */}
      <line x1={cx} y1={shoulderY + 2 * s} x2={cx + lArm.x} y2={shoulderY + 2 * s + lArm.y} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      <line x1={cx} y1={shoulderY + 2 * s} x2={cx + rArm.x} y2={shoulderY + 2 * s + rArm.y} stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
      {/* hands (little dots so gestures like peace/wave/heart read clearly) */}
      <circle cx={cx + lArm.x} cy={shoulderY + 2 * s + lArm.y} r={strokeW * 0.55} fill={color} />
      <circle cx={cx + rArm.x} cy={shoulderY + 2 * s + rArm.y} r={strokeW * 0.55} fill={color} />
      {/* head */}
      <circle
        cx={cx}
        cy={headY}
        r={headR}
        fill={color}
        style={{ transform: `rotate(${headTilt}deg)`, transformOrigin: `${cx}px ${headY}px` }}
      />
    </g>
  )
}

export default function PoseSilhouette({ pose, color = "#FFFFFF", opacity = 0.85, style = {} }) {
  if (!pose) return null
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block", width: "100%", height: "100%", opacity, ...style }}
    >
      {pose.actors.map((actor, i) => (
        <Actor key={i} {...actor} color={color} />
      ))}
    </svg>
  )
}
