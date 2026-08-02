import { useEffect, useRef, useState, useCallback } from "react"
import { BASE_URL, stitchClips } from "./api"

export function useGifExport() {
  const [exporting, setExporting]   = useState(false)
  const [gifUrl,    setGifUrl]      = useState(null)
  const [error,     setError]       = useState(null)
  const [backendPending, setBackendPending] = useState(false)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  const exportGif = useCallback(async (clips) => {
    setExporting(true)
    setError(null)
    setGifUrl(null)
    setBackendPending(false)

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    try {
      const res = await stitchClips(clips)
      const token = localStorage.getItem("token")
      const gifResponse = await fetch(`${BASE_URL}${res.data.gif_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!gifResponse.ok) {
        if (gifResponse.status === 401) {
          localStorage.removeItem("token")
          window.dispatchEvent(new Event("auth:expired"))
          throw new Error("Your session expired. Please sign in again.")
        }
        throw new Error(`GIF preview failed with status ${gifResponse.status}`)
      }
      const blob = await gifResponse.blob()
      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      setGifUrl(objectUrl)
    } catch (err) {
      // If backend endpoint not yet live, show a friendly pending state
      if (err.response?.status === 404 || err.code === "ERR_NETWORK") {
        setBackendPending(true)
      } else {
        setError(err.response?.data?.detail || "Export failed. Please try again.")
      }
    } finally {
      setExporting(false)
    }
  }, [])

  const reset = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setGifUrl(null)
    setError(null)
    setBackendPending(false)
  }, [])

  return { exporting, gifUrl, error, backendPending, exportGif, reset }
}