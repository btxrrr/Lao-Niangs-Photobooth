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

function handShape(variant, x, y, s, side, color) {
  // side: 1 for right, -1 for left
  const handR = Math.max(4, 5.5 * s)
  const fingerW = Math.max(1.8, 2.2 * s)
  const fingerL = Math.max(5, 7 * s)
  
  const elements = []
  
  // Main hand circle
  elements.push(
    <circle key="palm" cx={x} cy={y} r={handR} fill={color} fillOpacity="1" stroke={color} strokeWidth={Math.max(1, 1.5 * s)} />
  )
  
  // Different hand gestures based on variant
  switch (variant) {
    case "peace": {
      // Peace sign - two fingers extended upward
      const offset = handR * 0.6
      elements.push(
        <line key="f1" x1={x - offset} y1={y - handR} x2={x - offset} y2={y - handR - fingerL} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      elements.push(
        <line key="f2" x1={x + offset} y1={y - handR} x2={x + offset} y2={y - handR - fingerL} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      break
    }
    case "wave": {
      // Wave - fingers spread
      const angles = [-25, -10, 0, 10, 25].map(a => (a * Math.PI) / 180)
      angles.forEach((angle, i) => {
        const fx = Math.cos(angle) * fingerL
        const fy = -Math.sin(angle) * fingerL - handR
        elements.push(
          <line key={`wf${i}`} x1={x} y1={y - handR} x2={x + fx} y2={y + fy} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
        )
      })
      break
    }
    case "up": {
      // Thumbs up - upward extension
      elements.push(
        <line key="thumb" x1={x} y1={y - handR} x2={x} y2={y - handR - fingerL * 1.3} stroke={color} strokeWidth={fingerW * 1.2} strokeLinecap="round" opacity="1" />
      )
      break
    }
    case "down": {
      // Open hand facing down
      const offset = handR * 0.5
      elements.push(
        <line key="f1" x1={x - offset * 1.5} y1={y + handR} x2={x - offset * 1.5} y2={y + handR + fingerL} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      elements.push(
        <line key="f2" x1={x - offset * 0.5} y1={y + handR} x2={x - offset * 0.5} y2={y + handR + fingerL} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      elements.push(
        <line key="f3" x1={x + offset * 0.5} y1={y + handR} x2={x + offset * 0.5} y2={y + handR + fingerL} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      elements.push(
        <line key="f4" x1={x + offset * 1.5} y1={y + handR} x2={x + offset * 1.5} y2={y + handR + fingerL} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      break
    }
    case "out": {
      // Open hand side extended
      const offset = handR * 0.4
      elements.push(
        <line key="f1" x1={x + handR} y1={y - offset} x2={x + handR + fingerL} y2={y - offset} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      elements.push(
        <line key="f2" x1={x + handR} y1={y} x2={x + handR + fingerL * 0.9} y2={y + fingerW} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      elements.push(
        <line key="f3" x1={x + handR} y1={y + offset} x2={x + handR + fingerL} y2={y + offset} stroke={color} strokeWidth={fingerW} strokeLinecap="round" opacity="1" />
      )
      break
    }
    case "hip":
    case "heartL":
    case "heartR": {
      // Closed fist variant
      elements.push(
        <circle key="fist" cx={x} cy={y} r={handR * 0.85} fill={color} fillOpacity="0.6" stroke={color} strokeWidth={Math.max(1, 1.5 * s)} />
      )
      break
    }
  }
  
  return elements
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
  
  const lHandX = cx + lArm.x
  const lHandY = shoulderY + 1.5 * s + lArm.y
  const rHandX = cx + rArm.x
  const rHandY = shoulderY + 1.5 * s + rArm.y

  const limbW = Math.max(5.5, 9.2 * s)
  const torsoW = Math.max(11, 16 * s)
  const torsoH = Math.max(18, 26 * s)
  const bodyStroke = Math.max(2.5, 3.5 * s)
  const bodyFillOpacity = 0.32

  return (
    <g style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {/* Head with enhanced visibility */}
      <ellipse
        cx={cx}
        cy={headY}
        rx={headR * 0.95}
        ry={headR}
        fill={color}
        fillOpacity={bodyFillOpacity}
        stroke={color}
        strokeWidth={bodyStroke * 0.8}
        opacity="1"
        style={{ transform: `rotate(${headTilt}deg)`, transformOrigin: `${cx}px ${headY}px` }}
      />
      {/* Torso with better contrast */}
      <rect
        x={cx - torsoW / 2}
        y={shoulderY - 1.5 * s}
        width={torsoW}
        height={torsoH}
        rx={torsoW * 0.48}
        fill={color}
        fillOpacity={bodyFillOpacity}
        stroke={color}
        strokeWidth={bodyStroke * 0.65}
        opacity="1"
      />
      {/* Left arm */}
      <line x1={cx} y1={shoulderY + 1.5 * s} x2={lHandX} y2={lHandY} stroke={color} strokeOpacity="1" strokeWidth={limbW * 1.5} strokeLinecap="round" />
      {/* Right arm */}
      <line x1={cx} y1={shoulderY + 1.5 * s} x2={rHandX} y2={rHandY} stroke={color} strokeOpacity="1" strokeWidth={limbW * 1.5} strokeLinecap="round" />
      
      {/* Left hand with gesture details */}
      {handShape(armL, lHandX, lHandY, s, -1, color)}
      
      {/* Right hand with gesture details */}
      {handShape(armR, rHandX, rHandY, s, 1, color)}
      
      {/* Left leg */}
      <line x1={cx} y1={cy} x2={cx + lLeg.x} y2={cy + lLeg.y} stroke={color} strokeOpacity="1" strokeWidth={limbW * 1.55} strokeLinecap="round" />
      {/* Right leg */}
      <line x1={cx} y1={cy} x2={cx + rLeg.x} y2={cy + rLeg.y} stroke={color} strokeOpacity="1" strokeWidth={limbW * 1.55} strokeLinecap="round" />
    </g>
  )
}

export default function PoseSilhouette({ pose, color = "#FFFFFF", opacity = 0.45, style = {} }) {
  if (!pose) return null
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block", width: "100%", height: "100%", opacity, filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.25)) drop-shadow(0 0 12px rgba(255,255,255,0.3))", ...style }}
    >
      {pose.actors.map((actor, i) => (
        <Actor key={i} {...actor} color={color} />
      ))}
    </svg>
  )
}
