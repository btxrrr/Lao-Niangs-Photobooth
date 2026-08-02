import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import api, { listCaptures } from "../api/api"
import AuthImage from "../components/AuthImage"

// ─────────────────────────────────────────────────────────────
// Feature 7 — Sticker Pack Export
//
// Users pick one or more photos/GIFs from their archive and send
// them to the backend, which handles WhatsApp ZIP packaging and
// Telegram sticker-set publishing.
// ─────────────────────────────────────────────────────────────

export default function StickerExport() {
  const navigate = useNavigate()

  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState(new Set())
  const [platform, setPlatform] = useState("whatsapp")
  const [packTitle, setPackTitle] = useState("Lao Niangs Sticker Pack")
  const [telegramUsername, setTelegramUsername] = useState("")
  const [exporting, setExporting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [exportMsg, setExportMsg] = useState("")
  const [exportResult, setExportResult] = useState(null)

  useEffect(() => {
    listCaptures()
      .then((res) => setCaptures(res.data))
      .catch(() => setError("Could not load your memories. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  const toggleSelect = (id) => {
    setExportResult(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(captures.map((c) => c.id)))
  const clearAll = () => setSelected(new Set())

  const handleExport = useCallback(async () => {
    if (selected.size === 0) return
    setExporting(true)
    setExportResult(null)
    setExportMsg(platform === "telegram" ? "Publishing to Telegram…" : "Preparing WhatsApp ZIP…")

    try {
      const payload = {
        platform,
        title: packTitle,
        capture_ids: Array.from(selected),
      }

      if (platform === "telegram" && telegramUsername.trim()) {
        // Send username - backend will handle conversion if needed
        payload.telegram_username = telegramUsername.replace(/^@/, "") // Remove @ if user added it
      }

      const response = await api.post("/stickers/export", payload)
      const data = response.data
      if (data.artifact_url) {
        setExportResult({
          type: "download",
          artifactPath: data.artifact_url,
          downloadName: data.download_name || "sticker-pack.zip",
          message: data.message,
        })
      } else if (data.telegram_sticker_set_url) {
        setExportResult({
          type: "telegram",
          url: data.telegram_sticker_set_url,
          downloadName: data.telegram_sticker_set_name,
          message: data.message,
        })
      }
      setExportMsg("")
    } catch (err) {
      setError(err?.response?.data?.detail || "Some stickers could not be exported. Please try again.")
      setExportMsg("")
    } finally {
      setExporting(false)
    }
  }, [platform, selected, packTitle, telegramUsername])

  const handleDownloadArtifact = useCallback(async () => {
    if (!exportResult?.artifactPath) return

    setDownloading(true)
    try {
      const response = await api.get(exportResult.artifactPath, { responseType: "blob" })
      const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/zip" })
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = exportResult.downloadName || "sticker-pack.zip"
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not download the sticker pack. Please try again.")
    } finally {
      setDownloading(false)
    }
  }, [exportResult])

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
              Select a platform, then let the backend build the pack for WhatsApp or publish it to Telegram.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-secondary" onClick={selectAll} style={{ fontSize: 13 }}>Select all</button>
            <button className="btn-secondary" onClick={clearAll} style={{ fontSize: 13 }}>Clear</button>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 18, marginBottom: 24, display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label className="font-dm" style={{ color: "var(--text)", fontSize: 13, fontWeight: 700 }}>Sticker pack title</label>
            <input
              value={packTitle}
              onChange={(e) => setPackTitle(e.target.value)}
              placeholder="Lao Niangs Sticker Pack"
              style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", padding: "12px 14px", fontSize: 14 }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              className={platform === "whatsapp" ? "btn-primary" : "btn-secondary"}
              onClick={() => { setPlatform("whatsapp"); setExportResult(null) }}
              style={{ fontSize: 13 }}
            >
              WhatsApp ZIP
            </button>
            <button
              className={platform === "telegram" ? "btn-primary" : "btn-secondary"}
              onClick={() => { setPlatform("telegram"); setExportResult(null) }}
              style={{ fontSize: 13 }}
            >
              Telegram publish
            </button>
          </div>

          {/* Platform-specific instructions */}
          <div style={{ background: "rgba(244,167,185,0.08)", border: "1px solid rgba(244,167,185,0.25)", borderRadius: 12, padding: 14 }}>
            {platform === "whatsapp" ? (
              <div>
                <p className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                  📦 How to add stickers to WhatsApp:
                </p>
                <ol className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, paddingLeft: 20 }}>
                  <li>Download the ZIP file</li>
                  <li>Use a sticker maker app like "Sticker Maker" or "Sticker.ly"</li>
                  <li>Import the files from the downloaded ZIP</li>
                  <li>Add to WhatsApp as a custom sticker pack</li>
                </ol>
              </div>
            ) : (
              <div>
                <p className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                  💬 How to add stickers to Telegram:
                </p>
                <p className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6, marginBottom: 8 }}>
                  Click "Publish to Telegram" and you'll be taken to the Telegram sticker set directly. From there, you can add it to your account or share with others.
                </p>
              </div>
            )}
          </div>

          {platform === "telegram" && (
            <div>
              <p className="font-dm" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
                💬 How to add stickers to Telegram:
              </p>
              <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                <label className="font-dm" style={{ color: "var(--text)", fontSize: 13, fontWeight: 700 }}>Telegram username (optional)</label>
                <input
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@yourname or yourname"
                  style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)", padding: "12px 14px", fontSize: 14 }}
                />
              </div>
              <p className="font-dm" style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.6 }}>
                Enter your Telegram username (with or without the @). Click "Publish to Telegram" and the sticker pack will be added to your sticker collection automatically.
              </p>
            </div>
          )}
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

            {exportResult ? (
              exportResult.type === "download" ? (
                <button
                  onClick={handleDownloadArtifact}
                  disabled={downloading}
                  className="btn-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {downloading ? "Downloading…" : "⬇️ Download sticker-pack.zip"}
                </button>
              ) : (
                <a
                  href={exportResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  Open Telegram sticker pack
                </a>
              )
            ) : (
              <button
                className="btn-primary"
                onClick={handleExport}
                disabled={selected.size === 0 || exporting}
              >
                {exporting ? "Exporting…" : `${platform === "telegram" ? "Publish" : "Export"} ${selected.size || ""} sticker${selected.size === 1 ? "" : "s"} 🏷️`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
