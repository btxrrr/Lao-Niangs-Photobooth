import { useCallback, useRef } from "react"

// ─────────────────────────────────────────────────────────────
// TransformableLayer — a sticker/media layer on the Smart Frame
// Studio canvas that can be freely dragged, resized and rotated.
//
// The layer's (x, y) is its CENTER in canvas-space pixels; the
// parent canvas "stage" element may be visually scaled down with
// CSS (transform: scale(...)) to fit the screen, so every pointer
// event is converted from screen space to canvas space via the
// stage's bounding rect before doing any math. This keeps the
// drag/resize/rotate math simple regardless of zoom level.
// ─────────────────────────────────────────────────────────────

function toCanvasPoint(e, stageRef) {
  const rect = stageRef.current.getBoundingClientRect()
  const scaleX = rect.width  || 1
  const scaleY = rect.height || 1
  // stageRef holds the *visual* (scaled) box; caller passes the
  // logical canvas size separately so we can normalize.
  return { clientX: e.clientX, clientY: e.clientY, rect, scaleX, scaleY }
}

export default function TransformableLayer({
  layer, selected, stageRef, canvasW, canvasH,
  onSelect, onChange, onDelete, onDuplicate,
}) {
  const dragState = useRef(null)

  const canvasPos = useCallback((clientX, clientY) => {
    const rect = stageRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * canvasW
    const y = ((clientY - rect.top) / rect.height) * canvasH
    return { x, y }
  }, [stageRef, canvasW, canvasH])

  const startDrag = useCallback((e) => {
    e.stopPropagation()
    onSelect(layer.id)
    const p = canvasPos(e.clientX, e.clientY)
    dragState.current = { mode: "move", offX: p.x - layer.x, offY: p.y - layer.y }

    const onMove = (ev) => {
      const cp = canvasPos(ev.clientX, ev.clientY)
      onChange(layer.id, { x: cp.x - dragState.current.offX, y: cp.y - dragState.current.offY })
    }
    const onUp = () => {
      dragState.current = null
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }, [layer, onChange, onSelect, canvasPos])

  const startResize = useCallback((e) => {
    e.stopPropagation()
    onSelect(layer.id)
    const p = canvasPos(e.clientX, e.clientY)
    const startDist = Math.max(10, Math.hypot(p.x - layer.x, p.y - layer.y))
    const startW = layer.w, startH = layer.h

    const onMove = (ev) => {
      const cp = canvasPos(ev.clientX, ev.clientY)
      const dist = Math.hypot(cp.x - layer.x, cp.y - layer.y)
      const factor = Math.max(0.15, Math.min(6, dist / startDist))
      onChange(layer.id, {
        w: Math.max(24, startW * factor),
        h: Math.max(24, startH * factor),
      })
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }, [layer, onChange, onSelect, canvasPos])

  const startRotate = useCallback((e) => {
    e.stopPropagation()
    onSelect(layer.id)

    const onMove = (ev) => {
      const cp = canvasPos(ev.clientX, ev.clientY)
      const angle = Math.atan2(cp.y - layer.y, cp.x - layer.x) * (180 / Math.PI)
      onChange(layer.id, { rotation: angle + 90 })
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }, [layer, onChange, onSelect, canvasPos])

  return (
    <div
      onPointerDown={startDrag}
      style={{
        position: "absolute",
        left: layer.x - layer.w / 2,
        top: layer.y - layer.h / 2,
        width: layer.w,
        height: layer.h,
        transform: `rotate(${layer.rotation}deg)`,
        cursor: "grab",
        touchAction: "none",
        outline: selected ? "2px dashed rgba(224,122,149,0.9)" : "none",
        outlineOffset: 4,
      }}
    >
      {layer.variant === "emoji" ? (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: layer.h * 0.82, lineHeight: 1, userSelect: "none", pointerEvents: "none",
        }}>
          {layer.emoji}
        </div>
      ) : (
        <img
          src={layer.src}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none" }}
        />
      )}

      {selected && (
        <>
          {/* floating toolbar */}
          <div style={{
            position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: 4, background: "rgba(61,52,80,0.9)", borderRadius: 8, padding: 3,
          }}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDuplicate(layer.id) }}
              title="Duplicate" style={miniBtnStyle}
            >⧉</button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }}
              title="Delete" style={miniBtnStyle}
            >✕</button>
          </div>

          {/* rotate handle */}
          <div
            onPointerDown={startRotate}
            title="Rotate"
            style={{
              position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
              width: 14, height: 14, borderRadius: "50%",
              background: "white", border: "2px solid var(--pink-dark)", cursor: "grab",
            }}
          />
          {/* resize handle */}
          <div
            onPointerDown={startResize}
            title="Resize"
            style={{
              position: "absolute", bottom: -7, right: -7,
              width: 14, height: 14, borderRadius: "50%",
              background: "white", border: "2px solid var(--denim-dark)", cursor: "nwse-resize",
            }}
          />
        </>
      )}
    </div>
  )
}

const miniBtnStyle = {
  background: "none", border: "none", color: "white", fontSize: 12,
  cursor: "pointer", padding: "2px 6px", borderRadius: 4,
}
