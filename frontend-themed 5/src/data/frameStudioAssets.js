// ─────────────────────────────────────────────────────────────
// Smart Frame Studio — asset & preset definitions (Feature 5)
//
// Kept as plain JS data (not JSON) so each preset can carry both a
// CSS description (for the live DOM editor) and a canvas draw
// function (for the final export render) that share the same
// numbers — so what you see while editing matches what you export.
// ─────────────────────────────────────────────────────────────

export const CANVAS_PRESETS = [
  { id: "strip",  label: "Photo Strip", description: "Tall keepsake strip", w: 900,  h: 1350, emoji: "🎞️" },
  { id: "square", label: "Square Collage", description: "Instagram-style square", w: 1080, h: 1080, emoji: "⬛" },
  { id: "wide",   label: "Wide Banner", description: "Landscape memory board", w: 1280, h: 900, emoji: "🖼️" },
]

export const STORY_LAYOUT_PRESETS = [
  {
    id: "2cut",
    label: "2-Cut",
    description: "Two equal splits",
    emoji: "◫",
    slots: 2,
    grid: [
      { x: 0, y: 0,   w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: "3cut",
    label: "3-Cut",
    description: "Three vertical slices",
    emoji: "☰",
    slots: 3,
    grid: [
      { x: 0, y: 0,      w: 1, h: 0.333 },
      { x: 0, y: 0.333,  w: 1, h: 0.333 },
      { x: 0, y: 0.666,  w: 1, h: 0.334 },
    ],
  },
  {
    id: "4cut",
    label: "4-Cut",
    description: "Instagram-style 2×2",
    emoji: "⊞",
    slots: 4,
    grid: [
      { x: 0,   y: 0,   w: 0.5, h: 0.5 },
      { x: 0.5, y: 0,   w: 0.5, h: 0.5 },
      { x: 0,   y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
]

// ── Backgrounds ─────────────────────────────────────────────
export const BACKGROUND_PRESETS = [
  { id: "cream",     label: "Cream",       colors: ["#FEFAF6", "#F5EDE3"] },
  { id: "denim",     label: "Denim Sky",   colors: ["#A8C4D8", "#5A7A96"] },
  { id: "pink-dream", label: "Pink Dream", colors: ["#FDE8EE", "#F4A7B9"] },
  { id: "sunset",    label: "Sunset",      colors: ["#F4A7B9", "#7B9BB5"] },
  { id: "lavender",  label: "Lavender",    colors: ["#E4DEF5", "#B9A8D8"] },
  { id: "mint",      label: "Mint",        colors: ["#DCF3E8", "#8FCBAE"] },
]

export function backgroundCss(preset) {
  if (!preset) return "#FEFAF6"
  const [a, b] = preset.colors
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
}

export function drawBackgroundPreset(ctx, preset, w, h) {
  const [a, b] = preset.colors
  const grad = ctx.createLinearGradient(0, 0, w, h)
  grad.addColorStop(0, a)
  grad.addColorStop(1, b)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

// ── Decorative frames ───────────────────────────────────────
// Each preset draws its border as bands/shapes relative to canvas
// size so it scales cleanly across the three canvas presets above.
export const FRAME_PRESETS = [
  { id: "none", label: "None", swatch: "transparent" },
  {
    id: "polaroid",
    label: "Polaroid White",
    swatch: "#FFFFFF",
    thicknessRatio: 0.045,
    draw(ctx, w, h) {
      const t = Math.round(w * this.thicknessRatio)
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, w, t)          // top
      ctx.fillRect(0, h - t * 1.8, w, t * 1.8) // thicker bottom, polaroid-style
      ctx.fillRect(0, 0, t, h)          // left
      ctx.fillRect(w - t, 0, t, h)      // right
    },
  },
  {
    id: "pinkDashed",
    label: "Pink Dashed",
    swatch: "#E07A95",
    draw(ctx, w, h) {
      const inset = w * 0.035
      ctx.save()
      ctx.strokeStyle = "#E07A95"
      ctx.lineWidth = Math.max(4, w * 0.012)
      ctx.setLineDash([w * 0.02, w * 0.014])
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2)
      ctx.restore()
    },
  },
  {
    id: "washiCorners",
    label: "Washi Corners",
    swatch: "linear-gradient(90deg,#F4A7B9,#A8C4D8)",
    draw(ctx, w, h) {
      const tapeW = w * 0.16
      const tapeH = w * 0.05
      const corners = [
        { x: tapeW * 0.15, y: tapeH * 0.4, rot: -12 },
        { x: w - tapeW * 1.15, y: tapeH * 0.4, rot: 12 },
        { x: tapeW * 0.15, y: h - tapeH * 1.4, rot: 12 },
        { x: w - tapeW * 1.15, y: h - tapeH * 1.4, rot: -12 },
      ]
      ctx.save()
      ctx.fillStyle = "rgba(244,167,185,0.75)"
      corners.forEach(({ x, y, rot }) => {
        ctx.save()
        ctx.translate(x + tapeW / 2, y + tapeH / 2)
        ctx.rotate((rot * Math.PI) / 180)
        ctx.fillRect(-tapeW / 2, -tapeH / 2, tapeW, tapeH)
        ctx.restore()
      })
      ctx.restore()
    },
  },
  {
    id: "denimBorder",
    label: "Denim Bold",
    swatch: "#5A7A96",
    thicknessRatio: 0.03,
    draw(ctx, w, h) {
      const t = Math.round(w * this.thicknessRatio)
      ctx.strokeStyle = "#5A7A96"
      ctx.lineWidth = t
      ctx.strokeRect(t / 2, t / 2, w - t, h - t)
    },
  },
]

// CSS-only preview approximations of the frame presets above, used
// while editing (drawn as an absolutely-positioned overlay div).
export function frameOverlayStyle(frameId) {
  switch (frameId) {
    case "polaroid":
      return { border: "24px solid #FFFFFF", borderBottomWidth: 42 }
    case "pinkDashed":
      return { border: "5px dashed #E07A95", margin: 14 }
    case "denimBorder":
      return { border: "10px solid #5A7A96" }
    default:
      return null
  }
}

// ── Sticker library ─────────────────────────────────────────
export const STICKER_CATEGORIES = [
  {
    id: "hearts", label: "Hearts",
    items: ["💖", "💕", "💗", "💓", "❤️", "🩷"],
  },
  {
    id: "stars", label: "Stars & Sparkle",
    items: ["⭐", "✨", "🌟", "💫", "🌙", "☁️"],
  },
  {
    id: "party", label: "Party",
    items: ["🎉", "🎊", "🥳", "🎈", "🎀", "🍾"],
  },
  {
    id: "cute", label: "Cute",
    items: ["🌸", "🌺", "🦋", "🌈", "🍡", "🧸"],
  },
  {
    id: "fun", label: "Fun",
    items: ["😎", "👑", "🔥", "💯", "📸", "✌️"],
  },
]
