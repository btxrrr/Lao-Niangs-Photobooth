import { useState, useEffect } from "react"
import { getCaptureImageUrl } from "../api/api"

// ─────────────────────────────────────────────────────────────
// Normal <img> tags can't send an Authorization header,
// so photos behind the JWT-protected endpoint won't load.
//
// This component fetches the image as a blob using axios
// (which does send the token), then creates a local URL for it.
// Use this anywhere you need to display a saved capture.
//
// Usage:
//   <AuthImage captureId={capture.id} alt="My photo" style={{ width: "100%" }} />
// ─────────────────────────────────────────────────────────────

export default function AuthImage({ captureId, alt = "Photo", style = {}, className = "" }) {
  const [src,      setSrc]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [errored,  setErrored]  = useState(false)

  useEffect(() => {
    if (!captureId) return

    const token = localStorage.getItem("token")
    if (!token) { setErrored(true); setLoading(false); return }

    fetch(getCaptureImageUrl(captureId), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not ok")
        return res.blob()
      })
      .then((blob) => {
        setSrc(URL.createObjectURL(blob))
      })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false))

    // Clean up the object URL when the component unmounts
    return () => { if (src) URL.revokeObjectURL(src) }
  }, [captureId])

  if (loading) {
    return (
      <div style={{
        width: "100%", aspectRatio: "1",
        background: "var(--cream-dark)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-light)", fontSize: 24,
        ...style,
      }}>
        ⏳
      </div>
    )
  }

  if (errored || !src) {
    return (
      <div style={{
        width: "100%", aspectRatio: "1",
        background: "var(--cream-dark)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-light)", fontSize: 32,
        ...style,
      }}>
        🖼️
      </div>
    )
  }

  return <img src={src} alt={alt} style={style} className={className} />
}
