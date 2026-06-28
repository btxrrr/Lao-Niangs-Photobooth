import { useState, useCallback } from "react"
import { stitchClips } from "./api"

export function useGifExport() {
  const [exporting, setExporting]   = useState(false)
  const [gifUrl,    setGifUrl]      = useState(null)
  const [error,     setError]       = useState(null)
  const [backendPending, setBackendPending] = useState(false)

  const exportGif = useCallback(async (clips) => {
    setExporting(true)
    setError(null)
    setGifUrl(null)

    try {
      const res = await stitchClips(clips)
      setGifUrl(res.data.gif_url)
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
    setGifUrl(null)
    setError(null)
    setBackendPending(false)
  }, [])

  return { exporting, gifUrl, error, backendPending, exportGif, reset }
}