import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { POSE_TYPES, getDefaultPoseImages } from "../data/poses"
import AuthImage from "./AuthImage"
import {
  listPoseReferences, uploadPoseReference, deletePoseReference, getPoseReferenceImageUrl,
} from "../api/api"

// A custom pose reference from the backend, reshaped to the same shape
// as a bundled default pose so both can drop into the same grid /
// onSelect(pose) / Feeling Lucky flow.
function poseRefToPose(ref) {
  return {
    id: `custom-${ref.id}`,
    kind: "custom",
    refId: ref.id,
    type: ref.shot_type,
    label: ref.name,
    tip: "Your own reference photo",
    imageUrl: getPoseReferenceImageUrl(ref.id),
  }
}

// ─────────────────────────────────────────────────────────────
// PoseLibraryModal — Feature 6: Pose Assistant
//
// Two interaction modes live here:
//   • Pose Library Mode  — pick a shot type (Single / Duo / Trio /
//                           Quad — a fixed headcount, not a stepper),
//                           browse the reference photos for it, tap
//                           one to select it.
//   • Pose Roulette Mode — "Feeling Lucky" instantly picks a random
//                           pose from the same filtered list.
//
// Every pose is a real reference image — either bundled with the app
// (data/poses.js DEFAULT_POSE_IMAGES) or uploaded by this account
// (backend /poses API). There's no procedural stick-figure fallback.
//
// onSelect(pose | null) is called when the user confirms a pose or
// explicitly skips ("No pose, thanks").
// ─────────────────────────────────────────────────────────────
export default function PoseLibraryModal({ onSelect, onClose }) {
  const [shotType, setShotType] = useState("single")

  // Custom, user-uploaded pose references for the current shot type.
  const [customPoses, setCustomPoses] = useState([])
  const [customLoading, setCustomLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadName, setUploadName] = useState("")
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadPreview, setUploadPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const fileInputRef = useRef(null)

  const loadCustomPoses = useCallback(async () => {
    setCustomLoading(true)
    try {
      const res = await listPoseReferences(shotType)
      setCustomPoses(res.data.map(poseRefToPose))
    } catch {
      setCustomPoses([])
    } finally {
      setCustomLoading(false)
    }
  }, [shotType])

  useEffect(() => {
    loadCustomPoses()
  }, [loadCustomPoses])

  const defaultImagePoses = useMemo(() => getDefaultPoseImages(shotType), [shotType])

  // Custom (per-account) poses first, then bundled defaults.
  const poses = useMemo(
    () => [...customPoses, ...defaultImagePoses],
    [customPoses, defaultImagePoses]
  )

  const handleLucky = () => {
    if (poses.length === 0) return
    const pose = poses[Math.floor(Math.random() * poses.length)]
    onSelect(pose)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadPreview(URL.createObjectURL(file))
    setUploadError("")
  }

  const handleUploadSave = async () => {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    setUploadError("")
    try {
      await uploadPoseReference(uploadFile, uploadName.trim(), shotType)
      setShowUpload(false)
      setUploadName("")
      setUploadFile(null)
      setUploadPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await loadCustomPoses()
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Could not save this pose. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteCustom = async (e, pose) => {
    e.stopPropagation()
    if (!window.confirm(`Remove "${pose.label}" from your pose library?`)) return
    try {
      await deletePoseReference(pose.refId)
      setCustomPoses((prev) => prev.filter((p) => p.id !== pose.id))
    } catch {
      alert("Could not remove this pose. Please try again.")
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(61,52,80,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", padding: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 className="font-playfair" style={{ fontSize: 24, color: "var(--text)" }}>Pose Assistant 🕺</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-light)" }}>✕</button>
        </div>
        <p className="font-dm" style={{ fontSize: 13, color: "var(--text-light)", marginBottom: 20 }}>
          Pick a shot type, then browse poses or let us surprise you.
        </p>

        {/* Shot type selector — fixed headcounts, no stepper */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {POSE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setShotType(t.id)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 14,
                border: "1.5px solid",
                borderColor: shotType === t.id ? "var(--pink-dark)" : "rgba(244,167,185,0.35)",
                background: shotType === t.id ? "var(--pink-light)" : "white",
                color: shotType === t.id ? "var(--pink-dark)" : "var(--text-light)",
                fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: 13,
                cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 2 }}>{t.emoji}</div>
              {t.label}
            </button>
          ))}
        </div>

        {/* Feeling Lucky */}
        <button
          className="btn-primary"
          onClick={handleLucky}
          disabled={poses.length === 0}
          style={{ width: "100%", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          🎲 Feeling Lucky — surprise me
        </button>

        {/* Upload your own pose */}
        <div style={{ marginBottom: 20 }}>
          {!showUpload ? (
            <button
              className="btn-secondary"
              onClick={() => setShowUpload(true)}
              style={{ width: "100%", fontSize: 13 }}
            >
              ⬆️ Upload your own pose reference
            </button>
          ) : (
            <div style={{ background: "var(--cream-dark)", borderRadius: 14, padding: 14 }}>
              <p className="font-dm" style={{ fontSize: 12.5, color: "var(--text)", fontWeight: 600, marginBottom: 10 }}>
                Save a reference image for {POSE_TYPES.find((t) => t.id === shotType)?.label} shots
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 70, height: 70, borderRadius: 10, flexShrink: 0, cursor: "pointer",
                    background: uploadPreview ? `url(${uploadPreview}) center/cover` : "white",
                    border: "1.5px dashed rgba(244,167,185,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "var(--text-light)",
                  }}
                >
                  {!uploadPreview && "🖼️"}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Name this pose (e.g. Anime peace sign)"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    maxLength={60}
                    style={{ fontSize: 13, marginBottom: 8 }}
                  />
                  {uploadError && (
                    <p className="font-dm" style={{ fontSize: 11.5, color: "#B91C1C", marginBottom: 8 }}>{uploadError}</p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={handleUploadSave}
                      disabled={!uploadFile || !uploadName.trim() || uploading}
                      style={{ fontSize: 12.5, padding: "7px 16px" }}
                    >
                      {uploading ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setShowUpload(false); setUploadFile(null); setUploadPreview(null); setUploadName(""); setUploadError("")
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      style={{ fontSize: 12.5, padding: "7px 16px" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pose grid */}
        {customLoading && poses.length === 0 && (
          <p className="font-dm" style={{ fontSize: 12.5, color: "var(--text-light)", textAlign: "center", padding: 12 }}>
            Loading your poses…
          </p>
        )}
        {!customLoading && poses.length === 0 && (
          <p className="font-dm" style={{ fontSize: 12.5, color: "var(--text-light)", textAlign: "center", padding: 20 }}>
            No poses here yet — upload one above to get started.
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 14 }}>
          {poses.map((pose) => (
            <button
              key={pose.id}
              onClick={() => onSelect(pose)}
              style={{
                position: "relative",
                background: "var(--denim)", borderRadius: 14, border: "2px solid transparent",
                padding: 0, cursor: "pointer", overflow: "hidden", transition: "border-color 0.2s",
                display: "flex", flexDirection: "column",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--pink)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
            >
              {pose.kind === "custom" && (
                <span
                  onClick={(e) => handleDeleteCustom(e, pose)}
                  title="Remove this pose"
                  style={{
                    position: "absolute", top: 6, right: 6, zIndex: 2,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "rgba(61,52,80,0.8)", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, lineHeight: 1,
                  }}
                >
                  ✕
                </span>
              )}
              <div style={{ aspectRatio: "16 / 9" }}>
                {pose.kind === "custom" ? (
                  <AuthImage src={pose.imageUrl} alt={pose.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <img src={pose.src} alt={pose.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
              </div>
              <div style={{ background: "white", padding: "8px 10px" }}>
                <p className="font-dm" style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{pose.label}</p>
                <p className="font-dm" style={{ fontSize: 10.5, color: "var(--text-light)", marginTop: 2 }}>{pose.tip}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          className="btn-secondary"
          onClick={() => onSelect(null)}
          style={{ width: "100%", marginTop: 20, fontSize: 13 }}
        >
          No pose, thanks — just take the photo
        </button>
      </div>
    </div>
  )
}
