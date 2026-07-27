import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import JSZip from "jszip"
import { listCaptures, getCaptureImageUrl } from "../api/api"
import AuthImage from "../components/AuthImage"

// ─────────────────────────────────────────────────────────────
// Feature 7 — Sticker Pack Export
//
// Users pick one or more photos/GIFs from their archive and export
// them as messaging stickers:
//   • Static photos → resized/padded to a standard 512×512 sticker
//     canvas and exported as transparent-safe PNGs.
//   • Animated GIFs → exported as-is (renamed for sticker use) since
//     that's the native "animated sticker" format most messaging
//     platforms (WhatsApp, Telegram, Discord, etc.) accept directly.
// Everything is bundled into a single .zip via JSZip so users get
// one download for the whole pack, plus a per-item quick download.
// ─────────────────────────────────────────────────────────────

const STICKER_SIZE = 512

async function fetchAuthBlob(captureId) {
  const token = localStorage.getItem("token")
  const res = await fetch(getCaptureImageUrl(captureId), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error("Failed to fetch media")
  return res.blob()
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => { resolve(img); }
    img.onerror = reject
    img.src = url
  })
}

// Render a static image into a square sticker canvas (contain-fit,
// transparent padding) and return a PNG Blob.
async function makeStaticSticker(blob) {
  const img = await blobToImage(blob)
  const canvas = document.createElement("canvas")
  canvas.width = STICKER_SIZE
  canvas.height = STICKER_SIZE
  const ctx = canvas.getContext("2d")
  ctx.clearRect(0, 0, STICKER_SIZE, STICKER_SIZE)

  const scale = Math.min(STICKER_SIZE / img.width, STICKER_SIZE / img.height)
  const w = img.width * scale
  const h = img.height * scale
  const x = (STICKER_SIZE - w) / 2
  const y = (STICKER_SIZE - h) / 2
  ctx.drawImage(img, x, y, w, h)

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
}

function isAnimated(capture) {
  return capture.media_type === "gif" || (capture.content_type || "").includes("gif")
}

function slugify(text, fallback) {
  const base = (text || fallback || "sticker").toString().trim().toLowerCase()
  return base.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || fallback
}

export default function StickerExport() {
  const navigate = useNavigate()

  const [captures, setCaptures] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")
  const [selected, setSelected] = useState(new Set())
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState("")
  const [exportedZipUrl, setExportedZipUrl] = useState(null)

  useEffect(() => {
    listCaptures()
      .then((res) => setCaptures(res.data))
      .catch(() => setError("Could not load your memories. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  const toggleSelect = (id) => {
    setExportedZipUrl(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(captures.map((c) => c.id)))
  const clearAll  = () => setSelected(new Set())

  const handleExport = useCallback(async () => {
    if (selected.size === 0) return
    setExporting(true)
    setExportedZipUrl(null)
    setExportMsg("Preparing sticker pack…")

    try {
      const zip = new JSZip()
      const chosen = captures.filter((c) => selected.has(c.id))

      for (let i = 0; i < chosen.length; i++) {
        const c = chosen[i]
        setExportMsg(`Processing ${i + 1} of ${chosen.length}…`)
        const blob = await fetchAuthBlob(c.id)
        const name = slugify(c.caption, `sticker-${c.id}`)

        if (isAnimated(c)) {
          zip.file(`${name}.gif`, blob)
        } else {
          const stickerBlob = await makeStaticSticker(blob)
          zip.file(`${name}.png`, stickerBlob)
        }
      }

      setExportMsg("Zipping up…")
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      setExportedZipUrl(url)
      setExportMsg("")
    } catch (err) {
      setError("Some stickers could not be exported. Please try again.")
      setExportMsg("")
    } finally {
      setExporting(false)
    }
  }, [selected, captures])

  const handleSingleDownload = useCallback(async (capture) => {
    try {
      const blob = await fetchAuthBlob(capture.id)
      const name = slugify(capture.caption, `sticker-${capture.id}`)
      let outBlob = blob, ext = "gif"
      if (!isAnimated(capture)) {
        outBlob = await makeStaticSticker(blob)
        ext = "png"
      }
      const url = URL.createObjectURL(outBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${name}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Could not export this sticker.")
    }
  }, [])

  return (
    <div className="denim-bg" style={{ minHeight: "100vh", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", color: "white", fontSize: 22, cursor: "pointer", padding: 0 }}>
          ←
        </button>
        <h1 className="font-script" style={{ fontSize: 28, color: "white" }}>Sticker Pack Export 🏷️</h1>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="font-playfair" style={{ fontSize: 26, color: "white", marginBottom: 6 }}>Pick memories to turn into stickers</h2>
            <p className="font-dm" style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
              Photos become {STICKER_SIZE}×{STICKER_SIZE} sticker images. GIFs export as animated stickers.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={selectAll} style={{ fontSize: 13 }}>Select all</button>
            <button className="btn-secondary" onClick={clearAll} style={{ fontSize: 13 }}>Clear</button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "#B91C1C", fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading && (
          <p className="font-dm" style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center", padding: 60 }}>Loading your memories...</p>
        )}

        {!loading && captures.length === 0 && (
          <div className="glass-card" style={{ textAlign: "center", padding: "60px 40px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏷️</div>
            <h3 className="font-playfair" style={{ fontSize: 22, color: "var(--text)", marginBottom: 8 }}>No memories yet!</h3>
            <p className="font-dm" style={{ color: "var(--text-light)", marginBottom: 24, fontSize: 14 }}>
              Take a photo or GIF first, then come back to build a sticker pack.
            </p>
            <button className="btn-primary" onClick={() => navigate("/photobooth")}>Open Photo Booth</button>
          </div>
        )}

        {!loading && captures.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 18, marginBottom: 32 }}>
            {captures.map((c) => {
              const isSel = selected.has(c.id)
              const animated = isAnimated(c)
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  style={{
                    position: "relative", cursor: "pointer",
                    borderRadius: 16, overflow: "hidden",
                    border: isSel ? "3px solid var(--pink)" : "3px solid transparent",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
                    transition: "border-color 0.2s",
                    background: "white",
                  }}
                >
                  <div style={{ width: "100%", aspectRatio: "1", background: "var(--cream-dark)" }}>
                    <AuthImage captureId={c.id} alt={c.caption || "memory"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{
                    position: "absolute", top: 8, left: 8,
                    width: 22, height: 22, borderRadius: "50%",
                    background: isSel ? "var(--pink-dark)" : "rgba(255,255,255,0.85)",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, border: "1.5px solid rgba(255,255,255,0.9)",
                  }}>
                    {isSel ? "✓" : ""}
                  </div>
                  {animated && (
                    <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(61,52,80,0.85)", color: "white", borderRadius: 999, padding: "3px 8px", fontSize: 10, letterSpacing: "0.06em" }}>
                      GIF
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSingleDownload(c) }}
                    title="Quick export this one"
                    style={{
                      position: "absolute", bottom: 8, right: 8,
                      background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%",
                      width: 26, height: 26, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >⬇</button>
                </div>
              )
            })}
          </div>
        )}

        {!loading && captures.length > 0 && (
          <div className="glass-card" style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p className="font-dm" style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {selected.size} selected
              </p>
              {exportMsg && (
                <p className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", marginTop: 2 }}>{exportMsg}</p>
              )}
            </div>

            {exportedZipUrl ? (
              <a
                href={exportedZipUrl}
                download={`sticker-pack-${Date.now()}.zip`}
                className="btn-primary"
                style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                ⬇️ Download sticker-pack.zip
              </a>
            ) : (
              <button
                className="btn-primary"
                onClick={handleExport}
                disabled={selected.size === 0 || exporting}
              >
                {exporting ? "Exporting…" : `Export ${selected.size || ""} sticker${selected.size === 1 ? "" : "s"} 🏷️`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
