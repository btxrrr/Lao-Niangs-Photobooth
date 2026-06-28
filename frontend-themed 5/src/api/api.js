import axios from "axios"

// ─────────────────────────────────────────────────────────────
// This file is the single connection point between your React
// frontend and your FastAPI backend.
//
// Every page imports from here — if your backend URL ever
// changes (e.g. when you deploy), you only change it in ONE place.
// ─────────────────────────────────────────────────────────────

export const BASE_URL = "http://localhost:8000"

// Create an axios instance pointed at your backend
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
})

// Automatically attach the JWT token to every request if one is stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token")
      window.dispatchEvent(new Event("auth:expired"))
    }
    return Promise.reject(error)
  }
)

// ─────────────────────────────────────────────────────────────
// Auth endpoints
// ─────────────────────────────────────────────────────────────

export const registerUser = (data) =>
  // data: { email, username, password }
  api.post("/auth/register", data)

export const loginUser = (data) =>
  // data: { email, password }
  api.post("/auth/login", data)

export const logoutUser = () =>
  api.post("/auth/logout")

export const getMe = () =>
  api.get("/auth/me")

export const requestPasswordReset = (email) =>
  api.post("/auth/request-password-reset", { email })

export const resetPassword = (token, new_password) =>
  api.post("/auth/reset-password", { token, new_password })

// ─────────────────────────────────────────────────────────────
// Capture endpoints
// ─────────────────────────────────────────────────────────────

export const uploadCapture = (imageBlob, caption = "", frameStyle = "") => {
  // imageBlob: a Blob or File — react-webcam gives you a base64 string,
  // so we convert it to a Blob first (see useCapture hook below)
  const form = new FormData()
  form.append("file", imageBlob, "capture.jpg")
  if (caption)    form.append("caption", caption)
  if (frameStyle) form.append("frame_style", frameStyle)

  return api.post("/captures/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
}

export const getCapture = (id) =>
  api.get(`/captures/${id}`)

export const listCaptures = () =>
  api.get("/captures/")

export const deleteCapture = (id) =>
  api.delete(`/captures/${id}`)

// Helper: get the URL to display a capture image directly in an <img> tag
export const getCaptureImageUrl = (id) =>
  `${BASE_URL}/captures/${id}/image`

export default api

// ─────────────────────────────────────────────────────────────
// GIF stitch endpoint (backend: POST /clips/stitch)
// clips: array of Blob (webm video)
// returns: { gif_url: string }
// ─────────────────────────────────────────────────────────────
export const stitchClips = (clips) => {
  const form = new FormData()
  clips.forEach((blob, i) => form.append("clips", blob, `clip_${i}.webm`))
  return api.post("/clips/stitch", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
}
