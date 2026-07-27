// ─────────────────────────────────────────────────────────────
// Pose Assistant — pose template library
//
// Each pose is described declaratively as one or more stick-figure
// "actors" (see components/PoseSilhouette.jsx for the renderer) so
// the whole library stays lightweight (no image assets to ship) and
// easy to extend — add a new object here and it shows up everywhere.
//
// Single/Couple poses have a fixed actor count (1 / 2). Group poses
// are *templates*: the user tells us how many people are in the
// shot, and generateGroupActors() lays out that many stick figures
// in the chosen style (lineup / jump / huddle / pyramid) so every
// group pose works for anywhere from 3 to 10 people.
//
// Actor fields (all in a 0–100 x 0–100 canvas, mirrored for camera):
//   x, y      — hip anchor position
//   scale     — overall size multiplier
//   armL/armR — "down" | "up" | "out" | "hip" | "wave" | "heart"
//   legs      — "stand" | "apart" | "cross" | "kick" | "sit"
//   headTilt  — degrees, small head tilt for personality
// ─────────────────────────────────────────────────────────────

export const POSE_TYPES = [
  { id: "single", label: "Single",  emoji: "🧍", description: "Just you" },
  { id: "couple", label: "Couple",  emoji: "🧑‍🤝‍🧑", description: "Two people" },
  { id: "group",  label: "Group",   emoji: "👥", description: "Three or more" },
]

export const GROUP_SIZE_MIN = 3
export const GROUP_SIZE_MAX = 10
export const GROUP_SIZE_DEFAULT = 4

export const POSES = [
  // ── Single ──────────────────────────────────────────────
  {
    id: "single-peace",
    type: "single",
    label: "Peace Sign",
    tip: "Flash a peace sign near your face",
    actors: [{ x: 50, y: 62, scale: 1.15, armL: "down", armR: "peace", legs: "stand", headTilt: -4 }],
  },
  {
    id: "single-hands-heart",
    type: "single",
    label: "Hands Heart",
    tip: "Form a heart shape with both hands",
    actors: [{ x: 50, y: 62, scale: 1.15, armL: "heartL", armR: "heartR", legs: "stand", headTilt: 0 }],
  },
  {
    id: "single-hip",
    type: "single",
    label: "Hand on Hip",
    tip: "One hand on your hip, weight on one leg",
    actors: [{ x: 50, y: 62, scale: 1.15, armL: "hip", armR: "down", legs: "cross", headTilt: 6 }],
  },
  {
    id: "single-jump",
    type: "single",
    label: "Jump Shot",
    tip: "Jump with arms and legs spread wide",
    actors: [{ x: 50, y: 55, scale: 1.15, armL: "up", armR: "up", legs: "kick", headTilt: -3 }],
  },
  {
    id: "single-wave",
    type: "single",
    label: "Friendly Wave",
    tip: "Wave at the camera with a big smile",
    actors: [{ x: 50, y: 62, scale: 1.15, armL: "down", armR: "wave", legs: "stand", headTilt: -5 }],
  },

  // ── Couple ──────────────────────────────────────────────
  {
    id: "couple-shoulder",
    type: "couple",
    label: "Arm Around",
    tip: "One arm around your partner's shoulder",
    actors: [
      { x: 36, y: 62, scale: 1.05, armL: "down", armR: "shoulderR", legs: "stand", headTilt: -6 },
      { x: 64, y: 62, scale: 1.05, armL: "shoulderL", armR: "down", legs: "stand", headTilt: 6 },
    ],
  },
  {
    id: "couple-back-to-back",
    type: "couple",
    label: "Back to Back",
    tip: "Stand back-to-back, arms crossed",
    actors: [
      { x: 38, y: 62, scale: 1.05, armL: "hip", armR: "hip", legs: "cross", headTilt: -8, mirror: true },
      { x: 62, y: 62, scale: 1.05, armL: "hip", armR: "hip", legs: "cross", headTilt: 8 },
    ],
  },
  {
    id: "couple-heart",
    type: "couple",
    label: "Shared Heart",
    tip: "Each forms half a heart with inside hands",
    actors: [
      { x: 38, y: 62, scale: 1.05, armL: "down", armR: "heartR", legs: "stand", headTilt: -5 },
      { x: 62, y: 62, scale: 1.05, armL: "heartL", armR: "down", legs: "stand", headTilt: 5 },
    ],
  },
  {
    id: "couple-piggyback",
    type: "couple",
    label: "Piggyback",
    tip: "One hops on the other's back",
    actors: [
      { x: 40, y: 66, scale: 1.1, armL: "down", armR: "down", legs: "apart", headTilt: -4 },
      { x: 58, y: 50, scale: 0.95, armL: "up", armR: "up", legs: "sit", headTilt: 6 },
    ],
  },

  // ── Group (templates — actors generated per group size) ──
  {
    id: "group-lineup",
    type: "group",
    label: "Classic Lineup",
    tip: "Everyone stands shoulder to shoulder, arms linked",
    style: "lineup",
  },
  {
    id: "group-jump",
    type: "group",
    label: "Group Jump",
    tip: "Everyone jumps together on 3",
    style: "jump",
  },
  {
    id: "group-huddle",
    type: "group",
    label: "Huddle In",
    tip: "Lean heads in close together",
    style: "huddle",
  },
  {
    id: "group-pyramid",
    type: "group",
    label: "Staggered Pyramid",
    tip: "Alternate crouching and standing for a staggered look",
    style: "pyramid",
  },
]

// ── Group actor generation ───────────────────────────────────
function evenlySpacedX(n, marginPct) {
  if (n <= 1) return [50]
  const start = marginPct
  const end = 100 - marginPct
  const step = (end - start) / (n - 1)
  return Array.from({ length: n }, (_, i) => start + step * i)
}

function groupScale(n) {
  // more people → smaller each figure, so the whole group still fits
  return Math.max(0.5, Math.min(0.95, 0.98 - (n - 3) * 0.055))
}

export function clampGroupSize(n) {
  return Math.max(GROUP_SIZE_MIN, Math.min(GROUP_SIZE_MAX, Math.round(n) || GROUP_SIZE_DEFAULT))
}

export function generateGroupActors(style, rawN) {
  const n = clampGroupSize(rawN)
  const margin = n > 6 ? 7 : 12
  const xs = evenlySpacedX(n, margin)
  const s = groupScale(n)
  const mid = (n - 1) / 2

  switch (style) {
    case "lineup":
      return xs.map((x, i) => ({
        x, y: 64, scale: s,
        armL: i === 0 ? "down" : "shoulderL",
        armR: i === n - 1 ? "down" : "shoulderR",
        legs: "stand",
        headTilt: (i - mid) * 2.5,
      }))

    case "jump":
      return xs.map((x, i) => ({
        x, y: i % 2 === 0 ? 52 : 55, scale: s * 0.95,
        armL: "up", armR: "up", legs: "kick",
        headTilt: i % 2 === 0 ? -5 : 5,
      }))

    case "huddle":
      return xs.map((x, i) => ({
        x, y: 58 + Math.abs(i - mid) * 2.2, scale: s,
        armL: i === 0 ? "hip" : "shoulderL",
        armR: i === n - 1 ? "hip" : "shoulderR",
        legs: "stand",
        headTilt: (mid - i) * 4,
      }))

    case "pyramid":
      return xs.map((x, i) => {
        const front = i % 2 === 1
        return {
          x, y: front ? 72 : 60, scale: front ? s * 0.82 : s,
          armL: front ? "peace" : "down",
          armR: front ? "hip" : "up",
          legs: front ? "sit" : "stand",
          headTilt: (i - mid) * 3,
        }
      })

    default:
      return xs.map((x) => ({ x, y: 62, scale: s, armL: "down", armR: "down", legs: "stand", headTilt: 0 }))
  }
}

export function getPosesByType(type, groupSize = GROUP_SIZE_DEFAULT) {
  const pool = POSES.filter((p) => p.type === type)
  if (type !== "group") return pool
  const n = clampGroupSize(groupSize)
  return pool.map((p) => ({ ...p, actors: generateGroupActors(p.style, n), groupSize: n }))
}

export function getRandomPose(type, groupSize = GROUP_SIZE_DEFAULT) {
  const pool = getPosesByType(type, groupSize)
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
