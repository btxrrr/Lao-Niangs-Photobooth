import { useCallback } from "react"
import { uploadCapture } from "../api/api"

// ─────────────────────────────────────────────────────────────
// useCapture — a reusable hook for your Photobooth page.
//
// react-webcam gives you images as base64 strings.
// This hook converts them to a Blob and sends to the backend.
//
// Usage in Photobooth.jsx:
//   const { capture } = useCapture()
//   ...
//   const webcamRef = useRef(null)
//   const handleCapture = async () => {
//     const imageSrc = webcamRef.current.getScreenshot()  // base64 string
//     const result = await capture(imageSrc)
//     console.log("Saved capture id:", result.id)
//   }
// ─────────────────────────────────────────────────────────────

function base64ToBlob(base64) {
  // base64 looks like: "data:image/jpeg;base64,/9j/4AAQ..."
  const [header, data] = base64.split(",")
  const mime = header.match(/:(.*?);/)[1]       // e.g. "image/jpeg"
  const bytes = atob(data)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}

export function useCapture() {
  const capture = useCallback(async (base64Image, caption = "", frameStyle = "") => {
    const blob = base64ToBlob(base64Image)
    const res  = await uploadCapture(blob, caption, frameStyle)
    return res.data   // returns the capture object with { id, filename, ... }
  }, [])

  return { capture }
}
