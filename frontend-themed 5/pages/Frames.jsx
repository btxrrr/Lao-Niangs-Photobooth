import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Webcam from "react-webcam"
import { listCaptures, getCaptureImageUrl } from "../api/api"
import { useCapture } from "../api/useCapture"

// ─────────────────────────────────────────────────────────────
// Frame layouts
// ─────────────────────────────────────────────────────────────
const LAYOUTS = [
  {
    id: "4cut",
    label: "4-Cut",
    description: "2×2 grid",
    emoji: "⊞",
    slots: 4,
    // Each slot: { x, y, w, h } as fractions of the photo area (0–1)
    grid: [
      { x: 0,   y: 0,   w: 0.5, h: 0.5 },
      { x: 0.5, y: 0,   w: 0.5, h: 0.5 },
      { x: 0,   y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
    // Canvas dimensions
    canvasW: 800,
    canvasH: 1000,   // photo area + caption strip
    photoAreaH: 800,
  },
  {
    id: "3cut",
    label: "3-Cut",
    description: "Vertical strip",
    emoji: "☰",
    slots: 3,
    grid: [
      { x: 0, y: 0,      w: 1, h: 0.333 },
      { x: 0, y: 0.333,  w: 1, h: 0.333 },
      { x: 0, y: 0.666,  w: 1, h: 0.334 },
    ],
    canvasW: 600,
    canvasH: 1050,
    photoAreaH: 900,
  },
  {
    id: "multi",
    label: "Multi",
    description: "Feature + 2 small",
    emoji: "❏",
    slots: 3,
    grid: [
      { x: 0,   y: 0,    w: 1,   h: 0.55  },   // large top
      { x: 0,   y: 0.55, w: 0.5, h: 0.45  },   // bottom left
      { x: 0.5, y: 0.55, w: 0.5, h: 0.45  },   // bottom right
    ],
    canvasW: 800,
    canvasH: 1050,
    photoAreaH: 880,
  },
]

// ─────────────────────────────────────────────────────────────
// Helper: fetch a protected image as a data URL
// ─────────────────────────────────────────────────────────────
async function fetchImageAsDataUrl(captureId) {
  const token = localStorage.getItem("token")
  const res = await fetch(getCaptureImageUrl(captureId), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch image")
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// ─────────────────────────────────────────────────────────────
// Main Frames page
// ─────────────────────────────────────────────────────────────
export default function Frames() {
  const navigate  = useNavigate()
  const { capture: captureAndUpload } = useCapture()

  // Step: "layout" | "fill" | "caption" | "download"
  const [step,        setStep]        = useState("layout")
  const [layout,      setLayout]      = useState(null)
  const [slots,       setSlots]       = useState([])       // array of { dataUrl } or null
  const [activeSlot,  setActiveSlot]  = useState(null)     // index being filled
  const [caption,     setCaption]     = useState("")
  const [rendering,   setRendering]   = useState(false)
  const [finalImage,  setFinalImage]  = useState(null)     // data URL of rendered canvas

  // Gallery picker state
  const [gallery,      setGallery]      = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [pickerMode,   setPickerMode]   = useState(null)   // "gallery" | "webcam" | null

  // Webcam
  const webcamRef  = useRef(null)
  const [countdown, setCountdown] = useState(null)
  const canvasRef  = useRef(null)

  // ── Select layout ────────────────────────────────────────────
  const handleSelectLayout = (l) => {
    setLayout(l)
    setSlots(Array(l.slots).fill(null))
    setStep("fill")
  }

  // ── Open slot picker ─────────────────────────────────────────
  const openPicker = async (idx) => {
    setActiveSlot(idx)
    setPickerMode("gallery")
    if (gallery.length === 0) {
      setGalleryLoading(true)
      try {
        const res = await listCaptures()
        // Pre-fetch all images as data URLs so canvas can use them
        const withUrls = await Promise.all(
          res.data.map(async (c) => {
            try {
              const dataUrl = await fetchImageAsDataUrl(c.id)
              return { ...c, dataUrl }
            } catch {
              return { ...c, dataUrl: null }
            }
          })
        )
        setGallery(withUrls.filter((c) => c.dataUrl))
      } catch {
        alert("Could not load gallery.")
      } finally {
        setGalleryLoading(false)
      }
    }
  }

  // ── Pick from gallery ────────────────────────────────────────
  const pickFromGallery = (dataUrl) => {
    const updated = [...slots]
    updated[activeSlot] = { dataUrl }
    setSlots(updated)
    setPickerMode(null)
    setActiveSlot(null)
  }

  // ── Webcam countdown + capture ───────────────────────────────
  const startWebcamCountdown = useCallback(() => {
    let count = 3
    setCountdown(count)
    const interval = setInterval(() => {
      count -= 1
      if (count === 0) {
        clearInterval(interval)
        setCountdown(null)
        const imgSrc = webcamRef.current?.getScreenshot()
        if (imgSrc) {
          // Also upload to backend in background
          captureAndUpload(imgSrc).catch(() => {})
          const updated = [...slots]
          updated[activeSlot] = { dataUrl: imgSrc }
          setSlots(updated)
          setGallery((prev) => [{ id: Date.now(), dataUrl: imgSrc, caption: "" }, ...prev])
          setPickerMode(null)
          setActiveSlot(null)
        }
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [activeSlot, slots, captureAndUpload])

  // ── Render final canvas ──────────────────────────────────────
  const renderCanvas = useCallback(async () => {
    setRendering(true)
    const { canvasW, canvasH, photoAreaH, grid } = layout

    const canvas  = canvasRef.current
    canvas.width  = canvasW
    canvas.height = canvasH
    const ctx     = canvas.getContext("2d")

    // White polaroid background
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Subtle inner shadow border around photo area
    ctx.strokeStyle = "rgba(0,0,0,0.06)"
    ctx.lineWidth   = 2
    ctx.strokeRect(20, 20, canvasW - 40, photoAreaH - 20)

    // Draw each slot
    const PAD = 12  // gap between photos
    const photoX = 24
    const photoY = 24
    const photoW = canvasW - 48
    const photoH = photoAreaH - 48

    for (let i = 0; i < grid.length; i++) {
      const g    = grid[i]
      const slot = slots[i]
      const x = photoX + g.x * photoW + (g.x > 0 ? PAD / 2 : 0)
      const y = photoY + g.y * photoH + (g.y > 0 ? PAD / 2 : 0)
      const w = g.w * photoW - (g.x > 0 && g.x + g.w < 1 ? PAD : g.x > 0 || g.x + g.w < 1 ? PAD / 2 : 0)
      const h = g.h * photoH - (g.y > 0 && g.y + g.h < 1 ? PAD : g.y > 0 || g.y + g.h < 1 ? PAD / 2 : 0)

      if (slot?.dataUrl) {
        await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            // Cover-fit the image into the slot
            const iAspect = img.width / img.height
            const sAspect = w / h
            let sx, sy, sw, sh
            if (iAspect > sAspect) {
              sh = img.height; sw = sh * sAspect
              sx = (img.width - sw) / 2; sy = 0
            } else {
              sw = img.width; sh = sw / sAspect
              sx = 0; sy = (img.height - sh) / 2
            }
            ctx.save()
            ctx.beginPath()
            ctx.rect(x, y, w, h)
            ctx.clip()
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
            ctx.restore()
            resolve()
          }
          img.src = slot.dataUrl
        })
      } else {
        // Empty slot — light grey placeholder
        ctx.fillStyle = "#F0EBE5"
        ctx.fillRect(x, y, w, h)
        ctx.fillStyle = "#C4B8B0"
        ctx.font = `${Math.min(w, h) * 0.3}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("📷", x + w / 2, y + h / 2)
      }
    }

    // Caption strip
    const captionY  = photoAreaH
    const captionH  = canvasH - photoAreaH

    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, captionY, canvasW, captionH)

    // Thin pink divider line
    ctx.fillStyle = "#F4A7B9"
    ctx.fillRect(canvasW * 0.1, captionY + 10, canvasW * 0.8, 1.5)

    // Caption text
    ctx.fillStyle = "#3D3450"
    ctx.font      = `italic ${captionH * 0.28}px 'Georgia', serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(
      caption || "a memory ♡",
      canvasW / 2,
      captionY + captionH / 2,
    )

    // Tiny branding
    ctx.fillStyle = "#C4B8B0"
    ctx.font      = `${captionH * 0.15}px sans-serif`
    ctx.fillText("Lao Niangs Photo Booth", canvasW / 2, captionY + captionH - 14)

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95)
    setFinalImage(dataUrl)
    setRendering(false)
    setStep("download")
  }, [layout, slots, caption])

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="denim-bg" style={{ minHeight: "100vh", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => step === "layout" ? navigate("/dashboard") : setStep(step === "download" ? "caption" : step === "caption" ? "fill" : "layout")}
          style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0 }}>
          ←
        </button>
        <h1 className="font-script" style={{ fontSize: 28, color: "white" }}>
          Create Frame 🎞️
        </h1>
        {/* Step indicator */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["layout", "fill", "caption", "download"].map((s, i) => (
            <div key={s} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: ["layout","fill","caption","download"].indexOf(step) >= i
                ? "white" : "rgba(255,255,255,0.3)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 24px" }}>

        {/* ══════════════════════════════════════
            STEP 1 — Choose layout
        ══════════════════════════════════════ */}
        {step === "layout" && (
          <div>
            <h2 className="font-playfair" style={{ fontSize: 30, color: "white", marginBottom: 8 }}>
              Choose a layout
            </h2>
            <p className="font-dm" style={{ color: "rgba(255,255,255,0.65)", marginBottom: 32, fontSize: 14 }}>
              Pick how you want your photos arranged in the final frame.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {LAYOUTS.map((l) => (
                <button key={l.id} onClick={() => handleSelectLayout(l)}
                  style={{
                    background: "rgba(255,255,255,0.92)", borderRadius: 20,
                    border: "2px solid transparent", padding: 28,
                    cursor: "pointer", textAlign: "center", transition: "all 0.22s",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--pink)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                >
                  <LayoutPreview layout={l} />
                  <p className="font-playfair" style={{ fontSize: 18, color: "var(--text)", marginTop: 14, marginBottom: 4 }}>
                    {l.label}
                  </p>
                  <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)" }}>
                    {l.description} · {l.slots} photos
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 2 — Fill slots
        ══════════════════════════════════════ */}
        {step === "fill" && layout && (
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* Left: frame preview */}
            <div style={{ flex: "0 0 auto" }}>
              <p className="font-dm" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 12 }}>
                Tap a slot to fill it
              </p>
              <FramePreview layout={layout} slots={slots} onSlotClick={openPicker} activeSlot={activeSlot} />
            </div>

            {/* Right: picker panel */}
            <div style={{ flex: 1, minWidth: 260 }}>
              {pickerMode === null && (
                <div className="glass-card" style={{ padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
                  <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 14 }}>
                    Tap any slot on the left to fill it with a photo.
                  </p>
                  <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 13, marginTop: 8 }}>
                    {slots.filter(Boolean).length} / {layout.slots} filled
                  </p>
                </div>
              )}

              {pickerMode === "gallery" && (
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, padding: "9px 0", fontSize: 13 }}
                      onClick={() => setPickerMode("gallery")}
                    >
                      🖼️ Gallery
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, padding: "9px 0", fontSize: 13 }}
                      onClick={() => setPickerMode("webcam")}
                    >
                      📷 Take new
                    </button>
                  </div>

                  <p className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", marginBottom: 12 }}>
                    Slot {activeSlot + 1} — pick a photo
                  </p>

                  {galleryLoading && (
                    <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 13, textAlign: "center", padding: 20 }}>
                      Loading...
                    </p>
                  )}

                  {!galleryLoading && gallery.length === 0 && (
                    <p className="font-dm" style={{ color: "var(--text-light)", fontSize: 13, textAlign: "center", padding: 20 }}>
                      No photos in gallery yet. Take one!
                    </p>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                    {gallery.map((c) => (
                      <button key={c.id} onClick={() => pickFromGallery(c.dataUrl)}
                        style={{
                          padding: 0, border: "2px solid transparent", borderRadius: 8,
                          overflow: "hidden", cursor: "pointer", aspectRatio: "1",
                          transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--pink)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
                      >
                        <img src={c.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pickerMode === "webcam" && (
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                      className="btn-secondary"
                      style={{ flex: 1, padding: "9px 0", fontSize: 13 }}
                      onClick={() => setPickerMode("gallery")}
                    >
                      🖼️ Gallery
                    </button>
                    <button
                      className="btn-primary"
                      style={{ flex: 1, padding: "9px 0", fontSize: 13 }}
                      onClick={() => setPickerMode("webcam")}
                    >
                      📷 Take new
                    </button>
                  </div>

                  <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user" }}
                      style={{ width: "100%", display: "block" }}
                      mirrored
                    />
                    {countdown !== null && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: "rgba(0,0,0,0.35)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 72, color: "white", fontFamily: "Dancing Script, cursive" }}>
                          {countdown}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-primary"
                    onClick={startWebcamCountdown}
                    disabled={countdown !== null}
                    style={{ width: "100%", fontSize: 14 }}
                  >
                    {countdown !== null ? `${countdown}…` : "📷 Take Photo"}
                  </button>
                </div>
              )}

              {/* Next step button */}
              {slots.filter(Boolean).length === layout.slots && pickerMode === null && (
                <button
                  className="btn-primary"
                  onClick={() => setStep("caption")}
                  style={{ width: "100%", marginTop: 16, fontSize: 15 }}
                >
                  Next — Add caption →
                </button>
              )}
              {slots.filter(Boolean).length === layout.slots && pickerMode !== null && (
                <button
                  className="btn-secondary"
                  onClick={() => { setPickerMode(null); setActiveSlot(null) }}
                  style={{ width: "100%", marginTop: 12, fontSize: 13 }}
                >
                  Done picking
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 3 — Add caption
        ══════════════════════════════════════ */}
        {step === "caption" && layout && (
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "0 0 auto" }}>
              <FramePreview layout={layout} slots={slots} />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="glass-card" style={{ padding: 28 }}>
                <h3 className="font-playfair" style={{ fontSize: 20, color: "var(--text)", marginBottom: 6 }}>
                  Add a caption
                </h3>
                <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", marginBottom: 20 }}>
                  This appears at the bottom of your framed photo.
                </p>
                <input
                  type="text"
                  className="input-field"
                  placeholder="a memory ♡"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
                <p className="font-dm" style={{ fontSize: 11, color: "var(--text-light)", marginTop: 6, textAlign: "right" }}>
                  {caption.length}/60
                </p>
                <button
                  className="btn-primary"
                  onClick={renderCanvas}
                  disabled={rendering}
                  style={{ width: "100%", marginTop: 20, fontSize: 15 }}
                >
                  {rendering ? "Rendering…" : "Generate Frame ✨"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            STEP 4 — Download
        ══════════════════════════════════════ */}
        {step === "download" && finalImage && (
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center" }}>
            <div>
              <p className="font-dm" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 12, textAlign: "center" }}>
                Your framed photo is ready!
              </p>
              {/* Polaroid wrapper around the rendered image */}
              <div style={{
                background: "white",
                padding: "14px 14px 40px",
                borderRadius: 4,
                boxShadow: "4px 8px 32px rgba(0,0,0,0.25)",
                maxWidth: 360,
              }}>
                <img src={finalImage} alt="Your frame" style={{ width: "100%", display: "block", borderRadius: 2 }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
                <a
                  href={finalImage}
                  download={`laoniangs_frame_${Date.now()}.jpg`}
                  className="btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  ⬇️ Download
                </a>
                <button className="btn-secondary" onClick={() => { setStep("layout"); setFinalImage(null); setSlots([]); setCaption(""); setLayout(null) }}>
                  Make another
                </button>
                <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
                  Back to gallery
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas used for rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}


// ─────────────────────────────────────────────────────────────
// LayoutPreview — small SVG thumbnail of the layout grid
// ─────────────────────────────────────────────────────────────
function LayoutPreview({ layout }) {
  const W = 100, H = 110
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", margin: "0 auto" }}>
      <rect x={0} y={0} width={W} height={H} fill="#F5EDE3" rx={4} />
      {layout.grid.map((g, i) => (
        <rect
          key={i}
          x={4 + g.x * (W - 8) + (g.x > 0 ? 2 : 0)}
          y={4 + g.y * (H - 18) + (g.y > 0 ? 2 : 0)}
          width={g.w * (W - 8) - (g.x > 0 || g.x + g.w < 1 ? 2 : 0)}
          height={g.h * (H - 18) - (g.y > 0 || g.y + g.h < 1 ? 2 : 0)}
          fill="#A8C4D8"
          rx={2}
        />
      ))}
      {/* Caption strip */}
      <rect x={W * 0.2} y={H - 10} width={W * 0.6} height={2} fill="#F4A7B9" rx={1} />
    </svg>
  )
}


// ─────────────────────────────────────────────────────────────
// FramePreview — interactive slots showing filled / empty state
// ─────────────────────────────────────────────────────────────
function FramePreview({ layout, slots, onSlotClick, activeSlot }) {
  const PREVIEW_W = 260
  const PREVIEW_H = Math.round(PREVIEW_W * (layout.canvasH / layout.canvasW))
  const PHOTO_H   = Math.round(PREVIEW_W * (layout.photoAreaH / layout.canvasW))
  const PAD = 8

  return (
    <div style={{
      width: PREVIEW_W,
      height: PREVIEW_H,
      background: "white",
      borderRadius: 8,
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Photo slots */}
      {layout.grid.map((g, i) => {
        const x = PAD + g.x * (PREVIEW_W - PAD * 2) + (g.x > 0 ? PAD / 2 : 0)
        const y = PAD + g.y * (PHOTO_H - PAD * 2)   + (g.y > 0 ? PAD / 2 : 0)
        const w = g.w * (PREVIEW_W - PAD * 2) - (g.x > 0 || g.x + g.w < 1 ? PAD / 2 : 0)
        const h = g.h * (PHOTO_H - PAD * 2)   - (g.y > 0 || g.y + g.h < 1 ? PAD / 2 : 0)
        const filled = slots?.[i]
        const isActive = activeSlot === i

        return (
          <div
            key={i}
            onClick={() => onSlotClick?.(i)}
            style={{
              position: "absolute",
              left: x, top: y, width: w, height: h,
              background: filled ? "transparent" : "#F0EBE5",
              border: isActive ? "2.5px solid var(--pink-dark)" : filled ? "none" : "2px dashed #C4B8B0",
              borderRadius: 4,
              overflow: "hidden",
              cursor: onSlotClick ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "border-color 0.2s",
            }}
          >
            {filled ? (
              <img src={filled.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: Math.min(w, h) * 0.25, color: "#C4B8B0" }}>
                {isActive ? "✏️" : "+"}
              </span>
            )}
          </div>
        )
      })}

      {/* Caption strip */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: PREVIEW_H - PHOTO_H,
        background: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 3,
      }}>
        <div style={{ width: "60%", height: 1.5, background: "#F4A7B9", borderRadius: 1 }} />
        <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: "#3D3450", fontStyle: "italic", marginTop: 2 }}>
          caption
        </p>
      </div>
    </div>
  )
}
