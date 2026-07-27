// ─────────────────────────────────────────────────────────────
// PoseSilhouette — renders a pose (one or more silhouette actors)
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
  const cx = (x / 100) * VIEWBOX_W
  const cy = y

  const shoulderY = cy - 22 * s
  const headY = shoulderY - 11 * s
  const headR = 6.8 * s

  const lArm = armTarget(-1, armL, s)
  const rArm = armTarget(1, armR, s)
  const [lLeg, rLeg] = legTargets(legs, s)

  const limbW = Math.max(5.5, 9.2 * s)
  const torsoW = Math.max(11, 16 * s)
  const torsoH = Math.max(18, 26 * s)
  const bodyStroke = Math.max(2.5, 3.5 * s)
  const bodyFillOpacity = 0.24

  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <ellipse
        cx={cx}
        cy={headY}
        rx={headR * 0.95}
        ry={headR}
        fill={color}
        fillOpacity={bodyFillOpacity}
        stroke={color}
        strokeWidth={bodyStroke * 0.6}
        opacity="0.96"
        style={{ transform: `rotate(${headTilt}deg)`, transformOrigin: `${cx}px ${headY}px` }}
      />
      <rect
        x={cx - torsoW / 2}
        y={shoulderY - 1.5 * s}
        width={torsoW}
        height={torsoH}
        rx={torsoW * 0.48}
        fill={color}
        fillOpacity={bodyFillOpacity}
        stroke={color}
        strokeWidth={bodyStroke * 0.5}
        opacity="0.92"
      />
      <line x1={cx} y1={shoulderY + 1.5 * s} x2={cx + lArm.x} y2={shoulderY + 1.5 * s + lArm.y} stroke={color} strokeOpacity="0.98" strokeWidth={limbW * 1.35} strokeLinecap="round" />
      <line x1={cx} y1={shoulderY + 1.5 * s} x2={cx + rArm.x} y2={shoulderY + 1.5 * s + rArm.y} stroke={color} strokeOpacity="0.98" strokeWidth={limbW * 1.35} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + lLeg.x} y2={cy + lLeg.y} stroke={color} strokeOpacity="0.98" strokeWidth={limbW * 1.4} strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + rLeg.x} y2={cy + rLeg.y} stroke={color} strokeOpacity="0.98" strokeWidth={limbW * 1.4} strokeLinecap="round" />
    </g>
  )
}

export default function PoseSilhouette({ pose, color = "#FFFFFF", opacity = 0.85, style = {} }) {
  if (!pose) return null
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block", width: "100%", height: "100%", opacity, filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))", ...style }}
    >
      {pose.actors.map((actor, i) => (
        <Actor key={i} {...actor} color={color} />
      ))}
    </svg>
  )
}
