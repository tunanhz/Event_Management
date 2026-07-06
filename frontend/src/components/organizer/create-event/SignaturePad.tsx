"use client"

import { useEffect, useRef, useState } from "react"
import { Eraser, PenLine } from "lucide-react"
import styles from "./contract-step.module.css"

interface SignaturePadProps {
  /** Current signature as a PNG data URL (null = not signed yet). */
  value: string | null
  onChange: (dataUrl: string | null) => void
}

/**
 * Hand-drawn signature canvas (mouse + touch via Pointer Events).
 * Emits a PNG data URL on every completed stroke; the wizard uploads it to
 * /api/uploads/signatures at save time.
 */
export function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasStrokes, setHasStrokes] = useState(!!value)

  // Size the bitmap to the rendered box (crisp on HiDPI), then restore any
  // existing signature (edit mode / step revisit).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const { offsetWidth, offsetHeight } = canvas
    canvas.width = offsetWidth * dpr
    canvas.height = offsetHeight * dpr
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#1d4ed8"
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, offsetWidth, offsetHeight)
      img.src = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = e.currentTarget.getContext("2d")
    if (!ctx) return
    const { x, y } = pointerPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    drawing.current = true
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext("2d")
    if (!ctx) return
    const { x, y } = pointerPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    setHasStrokes(true)
    onChange(e.currentTarget.toDataURL("image/png"))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
    onChange(null)
  }

  return (
    <div className={styles.sigWrap}>
      <canvas
        ref={canvasRef}
        className={styles.sigCanvas}
        role="img"
        aria-label="Vùng ký tên — vẽ chữ ký bằng chuột hoặc cảm ứng"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {!hasStrokes && (
        <span className={styles.sigHint} aria-hidden="true">
          <PenLine size={16} /> Ký tên tại đây
        </span>
      )}
      <button type="button" className={styles.sigClear} onClick={clear} disabled={!hasStrokes}>
        <Eraser size={14} aria-hidden="true" /> Ký lại
      </button>
    </div>
  )
}
