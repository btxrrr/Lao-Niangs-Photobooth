import { useState, useRef, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { listCaptures, getCaptureImageUrl } from "../api/api"
import AuthImage from "../components/AuthImage"
import TransformableLayer from "../components/TransformableLayer"
import {
  CANVAS_PRESETS, BACKGROUND_PRESETS, FRAME_PRESETS, STICKER_CATEGORIES, STORY_LAYOUT_PRESETS,
  backgroundCss, drawBackgroundPreset, frameOverlayStyle,
} from "../data/frameStudioAssets"

// ─────────────────────────────────────────────────────────────
// Feature 5 — Smart Frame Studio
//
// A layered editor: pick a canvas template, then freely combine a
// background (preset or your own upload), a decorative frame
// overlay, built-in or custom stickers, and photos/GIFs from your
// archive — every sticker/media layer can be dragged, resized and
// rotated anywhere on the canvas. If any placed media is a GIF the
// final composition is exported as a short looping video so the
// motion is preserved; otherwise it exports as a still image.
// ─────────────────────────────────────────────────────────────

const PREVIEW_TARGET_W = 420

let uidCounter = 0
const uid = () => `l${Date.now()}_${uidCounter++}`

async function fetchAsDataUrl(captureId) {
  const token = localStorage.getItem("token")
  const res = await fetch(getCaptureImageUrl(captureId), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch media")
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const hiddenGifNodes = new WeakMap()

function cleanupHiddenGifNode(img) {
  const node = hiddenGifNodes.get(img)
  if (node && node.parentNode) {
    node.parentNode.removeChild(node)
  }
  hiddenGifNodes.delete(img)
}

function loadImageEl(src) {
  const isGif = typeof src === "string" && (/\.gif($|\?)/i.test(src) || src.startsWith("data:image/gif"))
  return new Promise((resolve, reject) => {
    const img = new Image()
    let node = null

    if (isGif && typeof document !== "undefined") {
      // For animated GIFs, position them where browser can render them for animation
      node = document.createElement("div")
      node.style.position = "absolute"
      node.style.left = "-1px"
      node.style.top = "-1px"
      node.style.width = "1px"
      node.style.height = "1px"
      node.style.overflow = "hidden"
      node.style.opacity = "1" // Must be visible for browser animation
      node.style.pointerEvents = "none"
      node.style.zIndex = "-9999"
      img.style.width = "100%"
      img.style.height = "100%"
      img.style.display = "block"
      node.appendChild(img)
      document.body.appendChild(node)
      hiddenGifNodes.set(img, node)
    }

    img.onload = () => {
      // Mark as animated GIF for export logic
      img._isAnimatedGif = isGif
      resolve(img)
    }
    img.onerror = (err) => {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node)
      }
      hiddenGifNodes.delete(img)
      reject(err)
    }
    img.src = src
  })
}

function coverDraw(ctx, img, w, h) {
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
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
}

function getStorySlotRects(layout, canvasW, canvasH) {
  if (!layout) return []

  const pad = Math.max(12, Math.round(Math.min(canvasW, canvasH) * 0.018))
  const photoW = canvasW - pad * 2
  const photoH = canvasH - pad * 2

  return layout.grid.map((g) => {
    const x = pad + g.x * photoW + (g.x > 0 ? pad / 2 : 0)
    const y = pad + g.y * photoH + (g.y > 0 ? pad / 2 : 0)
    const w = g.w * photoW - (g.x > 0 && g.x + g.w < 1 ? pad : g.x > 0 || g.x + g.w < 1 ? pad / 2 : 0)
    const h = g.h * photoH - (g.y > 0 && g.y + g.h < 1 ? pad : g.y > 0 || g.y + g.h < 1 ? pad / 2 : 0)

    return { x, y, w, h }
  })
}

export default function FrameStudio() {
  const navigate = useNavigate()

  const [step, setStep] = useState("canvas")           // canvas | edit | export
  const [canvasPreset, setCanvasPreset] = useState(null)

  const [background, setBackground] = useState({ kind: "preset", value: "cream" })
  const [frameId, setFrameId] = useState("none")
  const [storyLayoutId, setStoryLayoutId] = useState(null)
  const [storySlots, setStorySlots] = useState([])
  const [activeStorySlot, setActiveStorySlot] = useState(null)
  const [layers, setLayers] = useState([])
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [activeTab, setActiveTab] = useState("background")

  const [gallery, setGallery] = useState([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [addingMediaId, setAddingMediaId] = useState(null)

  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState("")
  const [resultUrl, setResultUrl] = useState(null)
  const [resultKind, setResultKind] = useState(null)
  const [mimeTypeUsed, setMimeTypeUsed] = useState(null)

  const stageRef = useRef(null)
  const zCounter = useRef(1)
  const bgFileRef = useRef(null)
  const stickerFileRef = useRef(null)

  const nextZ = () => zCounter.current++
  const storyLayout = STORY_LAYOUT_PRESETS.find((layout) => layout.id === storyLayoutId) || null

  // ── Canvas step ─────────────────────────────────────────────
  const handleSelectCanvas = (preset) => {
    setCanvasPreset(preset)
    setStep("edit")
  }

  const handleSelectStoryLayout = (layout) => {
    setStoryLayoutId(layout.id)
    setStorySlots(Array.from({ length: layout.slots }, () => null))
    setActiveStorySlot(0)
  }

  const handleClearStoryLayout = () => {
    setStoryLayoutId(null)
    setStorySlots([])
    setActiveStorySlot(null)
  }

  const previewScale = canvasPreset ? Math.min(1, PREVIEW_TARGET_W / canvasPreset.w) : 1
  const previewW = canvasPreset ? canvasPreset.w * previewScale : 0
  const previewH = canvasPreset ? canvasPreset.h * previewScale : 0

  // ── Layer helpers ───────────────────────────────────────────
  const updateLayer = useCallback((id, partial) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...partial } : l)))
  }, [])

  const deleteLayer = useCallback((id) => {
    setLayers((prev) => prev.filter((l) => l.id !== id))
    setSelectedLayerId((cur) => (cur === id ? null : cur))
  }, [])

  const duplicateLayer = useCallback((id) => {
    setLayers((prev) => {
      const src = prev.find((l) => l.id === id)
      if (!src) return prev
      const copy = { ...src, id: uid(), x: src.x + 24, y: src.y + 24, z: nextZ() }
      setSelectedLayerId(copy.id)
      return [...prev, copy]
    })
  }, [])

  const addStickerEmoji = useCallback((emoji) => {
    if (!canvasPreset) return
    const size = canvasPreset.w * 0.16
    const layer = {
      id: uid(), kind: "sticker", variant: "emoji", emoji,
      x: canvasPreset.w / 2, y: canvasPreset.h / 2,
      w: size, h: size, rotation: 0, z: nextZ(),
    }
    setLayers((prev) => [...prev, layer])
    setSelectedLayerId(layer.id)
  }, [canvasPreset])

  const addStickerImage = useCallback(async (file) => {
    if (!canvasPreset) return
    const dataUrl = await fileToDataUrl(file)
    const img = await loadImageEl(dataUrl)
    const maxDim = canvasPreset.w * 0.28
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
    const layer = {
      id: uid(), kind: "sticker", variant: "image", src: dataUrl, isGif: false,
      x: canvasPreset.w / 2, y: canvasPreset.h / 2,
      w: img.width * scale, h: img.height * scale, rotation: 0, z: nextZ(),
    }
    setLayers((prev) => [...prev, layer])
    setSelectedLayerId(layer.id)
  }, [canvasPreset])

  const addMediaFromGallery = useCallback(async (capture) => {
    if (!canvasPreset) return
    setAddingMediaId(capture.id)
    try {
      const dataUrl = await fetchAsDataUrl(capture.id)
      const img = await loadImageEl(dataUrl)

      if (storyLayout) {
        const isGif = capture.media_type === "gif" || (capture.content_type || "").includes("gif")
        let targetIndex = activeStorySlot

        if (targetIndex === null || targetIndex === undefined || storySlots[targetIndex]) {
          targetIndex = storySlots.findIndex((slot) => !slot)
        }

        if (targetIndex === -1) {
          alert("All split slots are already filled.")
          return
        }

        setStorySlots((prev) => {
          const next = [...prev]
          next[targetIndex] = { dataUrl, isGif }
          return next
        })

        setActiveStorySlot((current) => {
          const currentIndex = targetIndex ?? current ?? -1
          const nextEmpty = storySlots.findIndex((slot, index) => index > currentIndex && !slot)
          return nextEmpty === -1 ? null : nextEmpty
        })
      } else {
        const maxDim = canvasPreset.w * 0.55
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        const layer = {
          id: uid(), kind: "media", variant: "image", src: dataUrl,
          isGif: capture.media_type === "gif" || (capture.content_type || "").includes("gif"),
          x: canvasPreset.w / 2, y: canvasPreset.h / 2,
          w: img.width * scale, h: img.height * scale, rotation: 0, z: nextZ(),
        }
        setLayers((prev) => [...prev, layer])
        setSelectedLayerId(layer.id)
      }
    } catch {
      alert("Could not add this memory to the canvas.")
    } finally {
      setAddingMediaId(null)
    }
  }, [canvasPreset, storyLayout, activeStorySlot, storySlots])

  // ── Background upload ───────────────────────────────────────
  const handleBackgroundUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setBackground({ kind: "image", value: dataUrl })
    e.target.value = ""
  }, [])

  // ── Load gallery when Media tab opens ───────────────────────
  useEffect(() => {
    if (activeTab === "media" && gallery.length === 0 && !galleryLoading) {
      setGalleryLoading(true)
      listCaptures()
        .then((res) => setGallery(res.data))
        .catch(() => {})
        .finally(() => setGalleryLoading(false))
    }
  }, [activeTab, gallery.length, galleryLoading])

  // ── Export ───────────────────────────────────────────────────
  const runExport = useCallback(async () => {
    if (!canvasPreset) return
    setExporting(true)
    setResultUrl(null)
    setMimeTypeUsed(null)
    setExportMsg("Rendering composition…")

    try {
      const w = canvasPreset.w, h = canvasPreset.h
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")

      const imgCache = new Map()
      if (background.kind === "image") {
        imgCache.set("background", await loadImageEl(background.value))
      }
      for (const l of layers) {
        if (l.variant === "image") imgCache.set(l.id, await loadImageEl(l.src))
      }
      if (storyLayout) {
        for (const [index, slot] of storySlots.entries()) {
          if (slot?.dataUrl) imgCache.set(`story-${index}`, await loadImageEl(slot.dataUrl))
        }
      }

      const drawScene = (elapsedMs = 0) => {
        ctx.clearRect(0, 0, w, h)
        if (background.kind === "preset") {
          const preset = BACKGROUND_PRESETS.find((b) => b.id === background.value)
          drawBackgroundPreset(ctx, preset || BACKGROUND_PRESETS[0], w, h)
        } else if (background.kind === "image" && imgCache.get("background")) {
          coverDraw(ctx, imgCache.get("background"), w, h)
        }

        if (storyLayout) {
          const rects = getStorySlotRects(storyLayout, w, h)
          rects.forEach((rect, index) => {
            const slot = storySlots[index]
            ctx.save()
            ctx.beginPath()
            ctx.rect(rect.x, rect.y, rect.w, rect.h)
            ctx.clip()
            
            if (slot?.dataUrl && imgCache.get(`story-${index}`)) {
              const img = imgCache.get(`story-${index}`)
              const iAspect = img.width / img.height
              const sAspect = rect.w / rect.h
              let sx, sy, sw, sh
              
              if (iAspect > sAspect) {
                sh = img.height
                sw = sh * sAspect
                sx = (img.width - sw) / 2
                sy = 0
              } else {
                sw = img.width
                sh = sw / sAspect
                sx = 0
                sy = (img.height - sh) / 2
              }
              
              ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h)
            } else {
              ctx.fillStyle = "rgba(255,255,255,0.72)"
              ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
              ctx.fillStyle = "rgba(196,184,176,0.95)"
              ctx.font = `${Math.min(rect.w, rect.h) * 0.18}px sans-serif`
              ctx.textAlign = "center"
              ctx.textBaseline = "middle"
              ctx.fillText("+", rect.x + rect.w / 2, rect.y + rect.h / 2)
            }
            ctx.restore()
            ctx.strokeStyle = "rgba(255,255,255,0.9)"
            ctx.lineWidth = Math.max(3, w * 0.005)
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h)
          })
        }

        for (const l of [...layers].sort((a, b) => a.z - b.z)) {
          ctx.save()
          ctx.translate(l.x, l.y)
          ctx.rotate((l.rotation * Math.PI) / 180)
          if (l.variant === "emoji") {
            ctx.font = `${l.h}px sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(l.emoji, 0, 0)
          } else {
            const img = imgCache.get(l.id)
            if (img) ctx.drawImage(img, -l.w / 2, -l.h / 2, l.w, l.h)
          }
          ctx.restore()
        }

        const framePreset = FRAME_PRESETS.find((f) => f.id === frameId)
        framePreset?.draw?.(ctx, w, h)
      }

      const hasAnimated = layers.some((l) => l.isGif) || storySlots.some((slot) => slot?.isGif)

      if (!hasAnimated) {
        drawScene()
        setResultUrl(canvas.toDataURL("image/png"))
        setResultKind("image")
      } else {
        setExportMsg("Recording video to preserve motion…")
        const stream = canvas.captureStream(60)
        const chunks = []
        
        // Use WebM only - MP4 recording creates corrupted/unplayable files in most browsers
        let mimeType = "video/webm"
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus"
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus"
        }
        
        const mr = new MediaRecorder(stream, { mimeType })
        mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
        const stopped = new Promise((resolve) => { mr.onstop = resolve })
        mr.start()

        // Extended duration for better GIF animation visibility
        // GIFs need multiple animation cycles to be visible
        const DURATION_MS = 12000 // 12 seconds for multiple GIF loops
        const start = performance.now()
        
        const loop = (now) => {
          const elapsedMs = now - start
          drawScene(elapsedMs)
          
          if (elapsedMs < DURATION_MS) {
            requestAnimationFrame(loop)
          } else {
            mr.stop()
          }
        }
        
        requestAnimationFrame(loop)
        await stopped

        // Create blob with WebM format
        const blob = new Blob(chunks, { type: mimeType })
        setMimeTypeUsed(mimeType)
        setResultUrl(URL.createObjectURL(blob))
        setResultKind("video")
      }
      setStep("export")
    } catch (err) {
      console.error("Export error:", err)
      alert("Export failed. Please try again.")
    } finally {
      setExporting(false)
      setExportMsg("")
    }
  }, [canvasPreset, background, layers, frameId, storyLayout, storySlots])

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="denim-bg" style={{ minHeight: "100vh", paddingBottom: 60 }}>

      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button
          onClick={() => step === "canvas" ? navigate("/dashboard") : setStep(step === "export" ? "edit" : "canvas")}
          style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0 }}
        >←</button>
        <h1 className="font-script" style={{ fontSize: 28, color: "white" }}>Smart Frame Studio 🖼️</h1>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 24px" }}>

        {/* ══ STEP: choose canvas template ══ */}
        {step === "canvas" && (
          <div>
            <h2 className="font-playfair" style={{ fontSize: 28, color: "white", marginBottom: 8 }}>Choose a template</h2>
            <p className="font-dm" style={{ color: "rgba(255,255,255,0.65)", marginBottom: 28, fontSize: 14 }}>
              Pick a canvas shape to start building your composition.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
              {CANVAS_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectCanvas(p)}
                  className="glass-card"
                  style={{ padding: 28, textAlign: "center", cursor: "pointer", border: "2px solid transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--pink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                >
                  <div style={{ fontSize: 40, marginBottom: 10 }}>{p.emoji}</div>
                  <p className="font-playfair" style={{ fontSize: 18, color: "var(--text)" }}>{p.label}</p>
                  <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", marginTop: 4 }}>{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ══ STEP: edit ══ */}
        {step === "edit" && canvasPreset && (
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>

            {/* Canvas stage */}
            <div style={{ flex: "0 0 auto" }}>
              <div
                style={{
                  width: previewW, height: previewH, position: "relative",
                  overflow: "hidden", borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
                  background: "#F5EDE3",
                }}
                onPointerDown={() => setSelectedLayerId(null)}
              >
                <div
                  ref={stageRef}
                  style={{
                    width: canvasPreset.w, height: canvasPreset.h,
                    transform: `scale(${previewScale})`, transformOrigin: "top left",
                    position: "relative",
                    background: background.kind === "preset"
                      ? backgroundCss(BACKGROUND_PRESETS.find((b) => b.id === background.value))
                      : "#F5EDE3",
                  }}
                >
                  {background.kind === "image" && (
                    <img src={background.value} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  )}

                  {storyLayout && getStorySlotRects(storyLayout, canvasPreset.w, canvasPreset.h).map((rect, index) => {
                    const slot = storySlots[index]
                    const isActive = activeStorySlot === index

                    return (
                      <div key={index} style={{ position: "relative" }}>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            setActiveStorySlot(index)
                            setActiveTab("media")
                          }}
                          style={{
                            position: "absolute",
                            left: rect.x,
                            top: rect.y,
                            width: rect.w,
                            height: rect.h,
                            padding: 0,
                            border: isActive ? "3px solid var(--pink-dark)" : "2px solid rgba(255,255,255,0.9)",
                            borderRadius: 8,
                            overflow: "hidden",
                            cursor: "pointer",
                            background: slot ? "transparent" : "rgba(255,255,255,0.72)",
                            transition: "all 0.2s",
                          }}
                          title={slot ? "Click to change image, or use the X button to remove" : "Click to add image"}
                        >
                          {slot?.dataUrl ? (
                            <img src={slot.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          ) : (
                            <span style={{ color: "#C4B8B0", fontSize: Math.min(rect.w, rect.h) * 0.2, lineHeight: 1 }}>
                              {isActive ? "✏️" : "+"}
                            </span>
                          )}
                        </button>
                        
                        {/* Clear button for filled slots */}
                        {slot?.dataUrl && (
                          <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation()
                              setStorySlots((prev) => {
                                const next = [...prev]
                                next[index] = null
                                return next
                              })
                              setActiveStorySlot(null)
                            }}
                            style={{
                              position: "absolute",
                              right: rect.x + rect.w - 28,
                              top: rect.y + 8,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "rgba(220,38,38,0.9)",
                              color: "white",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 16,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              lineHeight: 1,
                              zIndex: 10,
                            }}
                            title="Remove this image"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {layers.sort((a, b) => a.z - b.z).map((l) => (
                    <TransformableLayer
                      key={l.id}
                      layer={l}
                      selected={selectedLayerId === l.id}
                      stageRef={stageRef}
                      canvasW={canvasPreset.w}
                      canvasH={canvasPreset.h}
                      onSelect={setSelectedLayerId}
                      onChange={updateLayer}
                      onDelete={deleteLayer}
                      onDuplicate={duplicateLayer}
                    />
                  ))}

                  {frameOverlayStyle(frameId) && (
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxSizing: "border-box", ...frameOverlayStyle(frameId) }} />
                  )}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={runExport}
                disabled={exporting}
                style={{ width: "100%", marginTop: 16 }}
              >
                {exporting ? (exportMsg || "Working…") : ((layers.some((l) => l.isGif) || storySlots.some((slot) => slot?.isGif)) ? "Export as Video 🎥" : "Export as Image 🖼️")}
              </button>
            </div>

            {/* Tabbed side panel */}
            <div style={{ flex: 1, minWidth: 300 }}>
              <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
                  {[
                    { id: "background", label: "🎨 Background" },
                    { id: "frame", label: "🖼️ Frame" },
                    { id: "stickers", label: "✨ Stickers" },
                    { id: "media", label: "📷 Media" },
                    { id: "layers", label: "📚 Layers" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      style={{
                        padding: "7px 12px", borderRadius: 50, border: "1.5px solid",
                        borderColor: activeTab === t.id ? "var(--pink-dark)" : "rgba(244,167,185,0.3)",
                        background: activeTab === t.id ? "var(--pink-light)" : "white",
                        color: activeTab === t.id ? "var(--pink-dark)" : "var(--text-light)",
                        fontSize: 12.5, fontFamily: "DM Sans, sans-serif", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Background tab */}
                {activeTab === "background" && (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
                      {BACKGROUND_PRESETS.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setBackground({ kind: "preset", value: b.id })}
                          style={{
                            aspectRatio: "1", borderRadius: 10, cursor: "pointer",
                            background: backgroundCss(b),
                            border: background.kind === "preset" && background.value === b.id ? "3px solid var(--pink-dark)" : "3px solid transparent",
                          }}
                          title={b.label}
                        />
                      ))}
                    </div>
                    <button className="btn-secondary" style={{ width: "100%", fontSize: 13 }} onClick={() => bgFileRef.current?.click()}>
                      ⬆️ Upload your own background
                    </button>
                    <input ref={bgFileRef} type="file" accept="image/*" hidden onChange={handleBackgroundUpload} />
                  </div>
                )}

                {/* Frame tab */}
                {activeTab === "frame" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                      {FRAME_PRESETS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFrameId(f.id)}
                          style={{
                            padding: "14px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                            background: "white",
                            border: frameId === f.id ? "2px solid var(--pink-dark)" : "2px solid rgba(244,167,185,0.25)",
                          }}
                        >
                          <div style={{
                            width: "100%", height: 44, borderRadius: 6, marginBottom: 8,
                            background: f.id === "none"
                              ? "repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 10px 10px"
                              : f.id === "washiCorners" ? f.swatch : "var(--cream-dark)",
                            border: f.id === "pinkDashed" ? "3px dashed #E07A95"
                              : (f.id === "polaroid" || f.id === "denimBorder") ? `4px solid ${f.swatch}`
                              : f.id === "none" ? "1px dashed #ccc" : "1px solid rgba(0,0,0,0.06)",
                          }} />
                          <p className="font-dm" style={{ fontSize: 11.5, color: "var(--text)", fontWeight: 600 }}>{f.label}</p>
                        </button>
                      ))}
                    </div>

                    <div style={{ background: "rgba(244,167,185,0.1)", border: "1px solid rgba(244,167,185,0.25)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <p className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                          Story grid layout
                        </p>
                        <p className="font-dm" style={{ fontSize: 12.5, color: "var(--text-light)", lineHeight: 1.5 }}>
                          Add 2, 3, or 4 split grids directly inside Frame Studio, then keep customizing the background, frame, stickers, and media.
                        </p>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                        {STORY_LAYOUT_PRESETS.map((layout) => {
                          const isActive = storyLayout?.id === layout.id
                          return (
                            <button
                              key={layout.id}
                              onClick={() => handleSelectStoryLayout(layout)}
                              style={{
                                padding: "12px 8px", borderRadius: 12, cursor: "pointer", textAlign: "center",
                                background: isActive ? "var(--pink-light)" : "white",
                                border: isActive ? "2px solid var(--pink-dark)" : "2px solid rgba(244,167,185,0.25)",
                              }}
                            >
                              <div style={{ fontSize: 22, marginBottom: 6 }}>{layout.emoji}</div>
                              <p className="font-dm" style={{ fontSize: 11.5, color: "var(--text)", fontWeight: 600 }}>{layout.label}</p>
                            </button>
                          )
                        })}
                      </div>

                      {storyLayout && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                          <p className="font-dm" style={{ fontSize: 12.5, color: "var(--text-light)" }}>
                            {storySlots.filter(Boolean).length} / {storyLayout.slots} split photos filled
                          </p>
                          <button className="btn-secondary" onClick={handleClearStoryLayout} style={{ fontSize: 12 }}>
                            Clear grid
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stickers tab */}
                {activeTab === "stickers" && (
                  <div>
                    {STICKER_CATEGORIES.map((cat) => (
                      <div key={cat.id} style={{ marginBottom: 14 }}>
                        <p className="font-dm" style={{ fontSize: 11.5, color: "var(--text-light)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {cat.label}
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                          {cat.items.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => addStickerEmoji(emoji)}
                              style={{
                                fontSize: 22, padding: 6, borderRadius: 8, border: "1px solid rgba(244,167,185,0.25)",
                                background: "white", cursor: "pointer",
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      className="btn-secondary"
                      style={{ width: "100%", fontSize: 13, marginTop: 4 }}
                      onClick={() => stickerFileRef.current?.click()}
                    >
                      ⬆️ Upload custom PNG sticker
                    </button>
                    <input
                      ref={stickerFileRef} type="file" accept="image/png,image/webp" hidden
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) addStickerImage(f); e.target.value = "" }}
                    />
                  </div>
                )}

                {/* Media tab */}
                {activeTab === "media" && (
                  <div>
                    {storyLayout && (
                      <div style={{ marginBottom: 12, background: "rgba(244,167,185,0.1)", border: "1px solid rgba(244,167,185,0.25)", borderRadius: 12, padding: 12 }}>
                        <p className="font-dm" style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 700, marginBottom: 4 }}>
                          Story grid active
                        </p>
                        <p className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.45 }}>
                          Tap a split on the canvas, then choose a memory below to fill that slot.
                        </p>
                      </div>
                    )}
                    {galleryLoading && (
                      <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", textAlign: "center", padding: 20 }}>Loading your memories…</p>
                    )}
                    {!galleryLoading && gallery.length === 0 && (
                      <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", textAlign: "center", padding: 20 }}>
                        No memories yet — take a photo or GIF first.
                      </p>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                      {gallery.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => addMediaFromGallery(c)}
                          disabled={addingMediaId === c.id}
                          style={{ position: "relative", padding: 0, border: "2px solid transparent", borderRadius: 8, overflow: "hidden", cursor: "pointer", aspectRatio: "1" }}
                        >
                          <AuthImage captureId={c.id} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          {(c.media_type === "gif") && (
                            <span style={{ position: "absolute", top: 4, right: 4, background: "rgba(61,52,80,0.85)", color: "white", fontSize: 9, padding: "2px 5px", borderRadius: 999 }}>GIF</span>
                          )}
                          {addingMediaId === c.id && (
                            <span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>…</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "layers" && (
                  <div>
                    {layers.length === 0 && (
                      <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", textAlign: "center", padding: 20 }}>
                        No stickers or media added yet.
                      </p>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[...layers].sort((a, b) => b.z - a.z).map((l) => (
                        <div
                          key={l.id}
                          onClick={() => setSelectedLayerId(l.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                            background: selectedLayerId === l.id ? "var(--pink-light)" : "white",
                            border: "1px solid rgba(244,167,185,0.25)",
                          }}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: 6, overflow: "hidden", background: "var(--cream-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                            {l.variant === "emoji" ? l.emoji : <img src={l.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          </div>
                          <span className="font-dm" style={{ fontSize: 12.5, color: "var(--text)", flex: 1 }}>
                            {l.kind === "media" ? (l.isGif ? "GIF layer" : "Photo layer") : "Sticker"}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id) }} style={miniIconBtn} title="Duplicate">⧉</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteLayer(l.id) }} style={miniIconBtn} title="Delete">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedLayer && (
                <p className="font-dm" style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 10, textAlign: "center" }}>
                  Drag to move · drag the pink dot to rotate · drag the blue dot to resize
                </p>
              )}
            </div>
          </div>
        )}

        {/* ══ STEP: export result ══ */}
        {step === "export" && resultUrl && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <p className="font-dm" style={{ color: "rgba(255,255,255,0.75)", fontSize: 14 }}>
              {resultKind === "video" ? "Your animated composition is ready!" : "Your composition is ready!"}
            </p>

            <div style={{ background: "white", padding: 14, borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.3)", maxWidth: 380 }}>
              {resultKind === "video" ? (
                <video src={resultUrl} controls loop autoPlay muted style={{ width: "100%", borderRadius: 4, display: "block" }} />
              ) : (
                <img src={resultUrl} alt="Your Smart Frame Studio composition" style={{ width: "100%", borderRadius: 4, display: "block" }} />
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href={resultUrl}
                download={`smart-frame-${Date.now()}.${resultKind === "video" ? "webm" : "png"}`}
                className="btn-primary"
                style={{ textDecoration: "none" }}
              >
                ⬇️ Download {resultKind === "video" ? "video" : "image"}
              </a>
              <button className="btn-secondary" onClick={() => setStep("edit")}>Keep editing</button>
              <button className="btn-secondary" onClick={() => navigate("/dashboard")}>Back to gallery</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const miniIconBtn = {
  background: "none", border: "none", color: "var(--text-light)", fontSize: 12, cursor: "pointer", padding: 2,
}
