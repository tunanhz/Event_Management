"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CameraOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"

/** Minimal typings for the native BarcodeDetector API (not yet in TS lib). */
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

type CameraState = "starting" | "active" | "denied" | "unsupported" | "error"

interface CameraQrScannerProps {
  /** Fired with the decoded QR payload. Same code is throttled for 3s. */
  onScan: (code: string) => void
}

/**
 * Live camera QR scanning for the gate (SRS dual-mode requirement).
 * Uses the rear camera + native BarcodeDetector; browsers without the API
 * (e.g. Firefox) get a clear message pointing back to manual entry.
 */
export function CameraQrScanner({ onScan }: CameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 })
  const [state, setState] = useState<CameraState>("starting")

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!navigator.mediaDevices?.getUserMedia || !Detector) {
      setState("unsupported")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      video.srcObject = stream
      await video.play()
      setState("active")
    } catch (err) {
      setState(err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "error")
    }
  }, [])

  // Open the camera on mount, release it on unmount / mode switch. The sync
  // "unsupported" state set is intentional one-shot init: camera capability is
  // only knowable in the browser, before any async work starts.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startCamera()
    return stopCamera
  }, [startCamera, stopCamera])

  // Poll video frames for QR codes while the camera is live.
  useEffect(() => {
    if (state !== "active") return
    const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Detector) return
    const detector = new Detector({ formats: ["qr_code"] })

    const intervalId = window.setInterval(async () => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return
      try {
        const codes = await detector.detect(video)
        const raw = codes[0]?.rawValue?.trim()
        if (!raw) return
        // Throttle: the same QR held in front of the lens fires only once per 3s.
        const now = Date.now()
        if (lastScanRef.current.code === raw && now - lastScanRef.current.at < 3000) return
        lastScanRef.current = { code: raw, at: now }
        onScan(raw)
      } catch {
        // Transient decode errors (frame not ready) — ignore and retry.
      }
    }, 400)

    return () => window.clearInterval(intervalId)
  }, [state, onScan])

  if (state === "unsupported" || state === "denied" || state === "error") {
    const message =
      state === "unsupported"
        ? "Trình duyệt này chưa hỗ trợ quét QR bằng camera. Hãy dùng chế độ nhập mã, hoặc mở bằng Chrome/Edge trên điện thoại."
        : state === "denied"
          ? "Bạn đã từ chối quyền camera. Cấp lại quyền trong cài đặt trình duyệt rồi thử lại."
          : "Không mở được camera. Kiểm tra thiết bị có camera sau hoạt động rồi thử lại."
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted p-8 text-center"
        role="alert"
      >
        <CameraOff size={32} className="text-muted-foreground" aria-hidden="true" />
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
        {state !== "unsupported" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setState("starting")
              void startCamera()
            }}
            className="gap-1.5"
          >
            <RefreshCw size={14} aria-hidden="true" /> Thử lại
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black">
      <video ref={videoRef} playsInline muted className="aspect-video w-full object-cover" />

      {/* Viewfinder frame */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
        <div className="h-48 w-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>

      <p className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center text-sm font-medium text-white">
        {state === "starting" ? "Đang mở camera…" : "Đưa mã QR của vé vào khung để check-in"}
      </p>
    </div>
  )
}
