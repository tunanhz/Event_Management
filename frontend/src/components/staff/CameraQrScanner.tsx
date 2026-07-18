"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { IScannerControls } from "@zxing/browser"
import { Camera, CameraOff, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface DetectedBarcode {
  rawValue: string
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike
type CameraState = "idle" | "starting" | "active" | "denied" | "insecure" | "unavailable" | "error"

interface CameraQrScannerProps {
  onScan: (code: string) => void
  disabled?: boolean
}

/**
 * Mobile-first QR scanner. Camera access starts from an explicit tap so the
 * permission prompt works consistently on iOS Safari and Android browsers.
 */
export function CameraQrScanner({ onScan, disabled = false }: CameraQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const sessionRef = useRef(0)
  const onScanRef = useRef(onScan)
  const disabledRef = useRef(disabled)
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 })
  const [state, setState] = useState<CameraState>("idle")

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  const emitScan = useCallback((rawValue: string) => {
    const code = rawValue.trim()
    if (!code || disabledRef.current) return

    const now = Date.now()
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 5000) return

    lastScanRef.current = { code, at: now }
    navigator.vibrate?.(80)
    onScanRef.current(code)
  }, [])

  const stopCamera = useCallback(() => {
    sessionRef.current += 1
    controlsRef.current?.stop()
    controlsRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    const video = videoRef.current
    if (video) {
      video.pause()
      video.srcObject = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    const session = sessionRef.current

    if (!window.isSecureContext) {
      setState("insecure")
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable")
      return
    }

    setState("starting")

    try {
      const video = videoRef.current
      if (!video) return

      const Detector = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      if (Detector) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (session !== sessionRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        await video.play()
      } else {
        const { BrowserQRCodeReader } = await import("@zxing/browser")
        const reader = new BrowserQRCodeReader(undefined, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 1000,
        })
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          video,
          (result) => {
            if (result) emitScan(result.getText())
          }
        )

        if (session !== sessionRef.current) {
          controls.stop()
          return
        }
        controlsRef.current = controls
      }

      if (session === sessionRef.current) setState("active")
    } catch (error) {
      if (session !== sessionRef.current) return

      const errorName = error instanceof DOMException ? error.name : (error as { name?: string })?.name
      const nextState =
        errorName === "NotAllowedError" || errorName === "SecurityError"
          ? "denied"
          : errorName === "NotFoundError" || errorName === "OverconstrainedError"
            ? "unavailable"
            : "error"

      stopCamera()
      setState(nextState)
    }
  }, [emitScan, stopCamera])

  useEffect(() => stopCamera, [stopCamera])

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
        if (codes[0]?.rawValue) emitScan(codes[0].rawValue)
      } catch {
        // The next frame is retried automatically.
      }
    }, 350)

    return () => window.clearInterval(intervalId)
  }, [emitScan, state])

  const failureMessage: Partial<Record<CameraState, string>> = {
    insecure: "Camera chỉ hoạt động qua HTTPS. Hãy mở đường dẫn HTTPS của hệ thống trên điện thoại.",
    denied: "Bạn chưa cấp quyền camera. Hãy cho phép Camera trong cài đặt trình duyệt rồi thử lại.",
    unavailable: "Không tìm thấy camera phù hợp trên thiết bị này.",
    error: "Không mở được camera. Camera có thể đang được ứng dụng khác sử dụng.",
  }

  const hasFailure = state === "insecure" || state === "denied" || state === "unavailable" || state === "error"

  return (
    <div className="relative min-h-72 overflow-hidden rounded-xl border border-border bg-black sm:min-h-80">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Camera quét mã QR"
      />

      {state === "active" && (
        <>
          <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
            <div className="h-52 w-52 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.38)]" />
          </div>
          <p className="absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2.5 text-center text-sm font-medium text-white">
            {disabled ? "Đang kiểm tra vé…" : "Đưa mã QR vào giữa khung để check-in"}
          </p>
        </>
      )}

      {state === "starting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 text-white" role="status">
          <Loader2 className="animate-spin" size={32} aria-hidden="true" />
          <p className="text-sm font-medium">Đang mở camera sau…</p>
        </div>
      )}

      {state === "idle" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
          <Camera size={36} className="text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Quét vé bằng camera điện thoại</p>
            <p className="mt-1 text-sm text-muted-foreground">Trình duyệt sẽ hỏi quyền sử dụng camera.</p>
          </div>
          <Button type="button" onClick={() => void startCamera()} className="gap-2">
            <Camera size={17} aria-hidden="true" /> Bật camera sau
          </Button>
        </div>
      )}

      {hasFailure && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center"
          role="alert"
        >
          <CameraOff size={34} className="text-muted-foreground" aria-hidden="true" />
          <p className="max-w-sm text-sm text-muted-foreground">{failureMessage[state]}</p>
          {state !== "insecure" && (
            <Button type="button" variant="outline" size="sm" onClick={() => void startCamera()} className="gap-1.5">
              <RefreshCw size={14} aria-hidden="true" /> Thử lại
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
