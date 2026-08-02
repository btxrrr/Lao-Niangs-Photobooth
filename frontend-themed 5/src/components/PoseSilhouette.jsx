// ─────────────────────────────────────────────────────────────
// PoseSilhouette — renders a pose (one or more actors) as a simple
// stick-figure line drawing. Used both as small thumbnails in the
// pose library grid and as the semi-transparent overlay shown on
// top of the live webcam preview.
//
// Kept deliberately plain: one stroke colour, one line weight, basic
// shapes (a circle for the head, straight lines for the body and
// limbs). No fills, no shading, no layered effects — just enough
// line to show the pose at a glance, like a simple sketch guide.
//
// The internal canvas is widescreen (matches the webcam's ~16:9
// frame) rather than square. Each actor's x position is authored as
// a 0–100 "percentage of frame width" in data/poses.js.
// ─────────────────────────────────────────────────────────────

const VIEWBOX_W = 178
const VIEWBOX_H = 100
const STROKE = 1.6

function armTarget(side, variant, s) {
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
    case "frameL":     return { x: -13 * s,       y: -19 * s }
    case "frameR":     return { x: 13 * s,        y: -19 * s }
    case "claw":       return { x: sign * 11 * s, y: -13 * s }
    case "peekL":      return { x: -6 * s,        y: -19 * s }
    case "peekR":      return { x: 6 * s,         y: -19 * s }
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

// A tiny mark at the hand showing the gesture — kept to a couple of
// short lines so it stays simple instead of trying to draw a full hand.
function GestureMark({ variant, x, y, s }) {
  const l = 6 * s
  switch (variant) {
    case "peace":
      return (
        <>
          <line x1={x - 2 * s} y1={y} x2={x - 3 * s} y2={y - l} />
          <line x1={x + 2 * s} y1={y} x2={x + 3 * s} y2={y - l} />
        </>
      )
    case "wave":
      return (
        <>
          <line x1={x} y1={y} x2={x - l * 0.8} y2={y - l * 0.6} />
          <line x1={x} y1={y} x2={x} y2={y - l} />
          <line x1={x} y1={y} x2={x + l * 0.8} y2={y - l * 0.6} />
        </>
      )
    case "up":
      return <line x1={x} y1={y} x2={x} y2={y - l * 1.2} />
    case "claw":
      return (
        <>
          <line x1={x} y1={y} x2={x - l * 0.7} y2={y - l * 0.5} />
          <line x1={x} y1={y} x2={x - l * 0.2} y2={y - l * 0.8} />
          <line x1={x} y1={y} x2={x + l * 0.3} y2={y - l * 0.8} />
          <line x1={x} y1={y} x2={x + l * 0.7} y2={y - l * 0.5} />
        </>
      )
    case "frameL":
      return (
        <>
          <line x1={x} y1={y} x2={x - l * 1.6} y2={y} />
          <line x1={x} y1={y} x2={x} y2={y + l * 1.3} />
        </>
      )
    case "frameR":
      return (
        <>
          <line x1={x} y1={y} x2={x + l * 1.6} y2={y} />
          <line x1={x} y1={y} x2={x} y2={y + l * 1.3} />
        </>
      )
    case "peekL":
    case "peekR":
      return <circle cx={x} cy={y} r={l * 0.55} fill="none" />
    default:
      return null
  }
}

function Actor({ x, y, scale, armL, armR, legs, headTilt = 0 }) {
  const s = scale
  const cx = (x / 100) * VIEWBOX_W
  const cy = y

  const headR = 6.4 * s
  const shoulderY = cy - 20 * s
  const headY = shoulderY - headR - 3 * s
  const hipY = shoulderY + 20 * s

  const lArm = armTarget(-1, armL, s)
  const rArm = armTarget(1, armR, s)
  const [lLeg, rLeg] = legTargets(legs, s)

  const lHandX = cx + lArm.x
  const lHandY = shoulderY + lArm.y
  const rHandX = cx + rArm.x
  const rHandY = shoulderY + rArm.y

  return (
    <g>
      {/* Head */}
      <circle
        cx={cx} cy={headY} r={headR}
        style={{ transform: `rotate(${headTilt}deg)`, transformOrigin: `${cx}px ${headY}px` }}
      />
      {/* Body */}
      <line x1={cx} y1={headY + headR} x2={cx} y2={hipY} />
      {/* Arms */}
      <line x1={cx} y1={shoulderY} x2={lHandX} y2={lHandY} />
      <line x1={cx} y1={shoulderY} x2={rHandX} y2={rHandY} />
      {/* Legs */}
      <line x1={cx} y1={hipY} x2={cx + lLeg.x} y2={cy + lLeg.y} />
      <line x1={cx} y1={hipY} x2={cx + rLeg.x} y2={cy + rLeg.y} />
      {/* Gesture marks at each hand */}
      <GestureMark variant={armL} x={lHandX} y={lHandY} s={s} />
      <GestureMark variant={armR} x={rHandX} y={rHandY} s={s} />
    </g>
  )
}

export default function PoseSilhouette({ pose, color = "#FFFFFF", opacity = 0.85, style = {} }) {
  if (!pose) return null
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    >
      <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
        {pose.actors.map((actor, i) => (
          <Actor key={i} {...actor} />
        ))}
      </g>
    </svg>
  )
}
