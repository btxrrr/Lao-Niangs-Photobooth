import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { listCaptures, deleteCapture, getCaptureImageUrl } from "../api/api"
import AuthImage from "../components/AuthImage"

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [captures, setCaptures] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState("")
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    listCaptures()
      .then((res) => setCaptures(res.data))
      .catch(() => setError("Could not load your photos. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  const photoCount = captures.filter((capture) => capture.media_type !== "gif").length
  const gifCount = captures.filter((capture) => capture.media_type === "gif").length

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this photo?")) return
    setDeleting(id)
    try {
      await deleteCapture(id)
      setCaptures((prev) => prev.filter((c) => c.id !== id))
    } catch {
      alert("Could not delete photo. Please try again.")
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (id, filename) => {
    const token = localStorage.getItem("token")
    try {
      const res  = await fetch(getCaptureImageUrl(id), { headers: { Authorization: `Bearer ${token}` } })
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = filename || `photo_${id}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Could not download photo.")
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="denim-bg" style={{ minHeight: "100vh", paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
        padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 className="font-script" style={{ fontSize: 28, color: "white" }}>Lao Niangs 📸</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="font-dm" style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
            Hey, {user?.username} 👋
          </span>
          <button className="btn-secondary" onClick={handleLogout} style={{ padding: "8px 20px", fontSize: 13 }}>
            Log out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>

        {/* Title + action buttons — always visible */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 className="font-playfair" style={{ fontSize: 32, color: "white", marginBottom: 6 }}>Your Memories</h2>
            <p className="font-dm" style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
              {captures.length === 0
                ? "No memories yet"
                : `${photoCount} photo${photoCount === 1 ? "" : "s"}${gifCount ? ` · ${gifCount} GIF${gifCount === 1 ? "" : "s"}` : ""} saved`}
            </p>
          </div>

          {/* Buttons always rendered */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {captures.length >= 2 && (
              <button
                className="btn-secondary"
                onClick={() => navigate("/frames")}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ fontSize: 16 }}>🎞️</span> Create Frame
              </button>
            )}
            <button
              className="btn-secondary"
              onClick={() => navigate("/gesture-gif")}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 16 }}>🎬</span> GIF Booth
            </button>
            <button
              className="btn-primary"
              onClick={() => navigate("/photobooth")}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ fontSize: 18 }}>📷</span> New Photo
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FEE2E2", border: "1px solid #F87171", borderRadius: 12, padding: "12px 16px", marginBottom: 24, color: "#B91C1C", fontSize: 14 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <p className="font-dm" style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>Loading your photos...</p>
          </div>
        )}

        {!loading && captures.length === 0 && !error && (
          <div className="glass-card" style={{ textAlign: "center", padding: "60px 40px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎞️</div>
            <h3 className="font-playfair" style={{ fontSize: 22, color: "var(--text)", marginBottom: 8 }}>No memories yet!</h3>
            <p className="font-dm" style={{ color: "var(--text-light)", marginBottom: 24, fontSize: 14 }}>
              Head to the booth to take your first photo or GIF.
            </p>
            <button className="btn-primary" onClick={() => navigate("/photobooth")}>Open Photo Booth</button>
          </div>
        )}

        {!loading && captures.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 28 }}>
            {captures.map((capture, i) => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                rotate={i % 2 === 0 ? -2 : 2.5}
                onDelete={handleDelete}
                onDownload={handleDownload}
                isDeleting={deleting === capture.id}
              />
            ))}
          </div>
        )}

        {!loading && captures.length === 1 && (
          <p className="font-dm" style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", marginTop: 24 }}>
            Take one more photo to unlock the Create Frame feature 🎞️
          </p>
        )}
      </div>
    </div>
  )
}

function CaptureCard({ capture, rotate, onDelete, onDownload, isDeleting }) {
  const date    = new Date(capture.created_at)
  const dateStr = date.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })
  const isGif   = capture.media_type === "gif"

  return (
    <div style={{ position: "relative" }}>
      <div className="tape" />
      <div className={`polaroid ${rotate > 0 ? "polaroid-2" : ""}`} style={{ "--rot": `${rotate}deg` }}>
        <div style={{ width: "100%", aspectRatio: "1", background: "var(--cream-dark)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
          <AuthImage captureId={capture.id} alt={capture.caption || "Photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          {isGif && (
            <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(61,52,80,0.85)", color: "white", borderRadius: 999, padding: "4px 8px", fontSize: 10, letterSpacing: "0.08em" }}>
              GIF
            </div>
          )}
        </div>
        <div style={{ padding: "6px 4px 0" }}>
          <p className="font-script" style={{ fontSize: 15, color: "var(--text)", minHeight: 22, textAlign: "center" }}>
            {capture.caption || ""}
          </p>
          <p className="font-dm" style={{ fontSize: 11, color: "var(--text-light)", textAlign: "center", marginTop: 2 }}>
            {dateStr}
          </p>
          {capture.frame_style && (
            <p className="font-dm" style={{ fontSize: 10, color: "var(--denim-dark)", textAlign: "center", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {capture.frame_style}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDownload(capture.id, capture.original_filename)}
        title={isGif ? "Download GIF" : "Download photo"}
        style={{
          position: "absolute", bottom: -10, right: 42,
          background: "#7B9BB5", color: "white",
          border: "none", borderRadius: "50%",
          width: 28, height: 28, fontSize: 13,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)", transition: "all 0.2s",
        }}
      >⬇</button>

      <button
        onClick={() => onDelete(capture.id)}
        disabled={isDeleting}
        title="Delete memory"
        style={{
          position: "absolute", bottom: -10, right: 8,
          background: isDeleting ? "#ccc" : "#F87171", color: "white",
          border: "none", borderRadius: "50%",
          width: 28, height: 28, fontSize: 13,
          cursor: isDeleting ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)", transition: "all 0.2s",
        }}
      >{isDeleting ? "..." : "✕"}</button>
    </div>
  )
}