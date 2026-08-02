import { useState, useEffect } from "react"
import { getCaptureImageUrl } from "../api/api"

// ─────────────────────────────────────────────────────────────
// Normal <img> tags can't send an Authorization header,
// so photos behind the JWT-protected endpoint won't load.
//
// This component fetches the image as a blob using fetch (with the
// token attached manually), then creates a local URL for it. Use this
// anywhere you need to display an image served from a protected
// endpoint — a saved capture, a custom pose reference, etc.
//
// Usage:
//   <AuthImage captureId={capture.id} alt="My photo" style={{ width: "100%" }} />
//   <AuthImage src={getPoseReferenceImageUrl(pose.refId)} alt="My pose" style={{ width: "100%" }} />
// ─────────────────────────────────────────────────────────────

export default function AuthImage({ captureId, src: srcUrl, alt = "Photo", style = {}, className = "" }) {
  const [src,      setSrc]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [errored,  setErrored]  = useState(false)

  const url = srcUrl || (captureId ? getCaptureImageUrl(captureId) : null)

  useEffect(() => {
    if (!url) return

    const token = localStorage.getItem("token")
    if (!token) { setErrored(true); setLoading(false); return }

    setLoading(true)
    setErrored(false)

    fetch(url, {
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
  }, [url])

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
