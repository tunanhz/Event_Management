"use client"

import { useRef, useState, type FormEvent } from "react"
import { ScanLine, CheckCircle2, AlertTriangle, XCircle, Camera, Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/badge"
import { CameraQrScanner } from "./CameraQrScanner"
import type { CheckInResult } from "./staff-checkin-data"

type ScanMode = "manual" | "camera"

const SCAN_MODES: { id: ScanMode; label: string; icon: typeof Camera }[] = [
  { id: "manual", label: "Nhập mã", icon: Keyboard },
  { id: "camera", label: "Camera QR", icon: Camera },
]

interface CheckInScannerProps {
  /** Fired with the raw scanned/typed code on submit. */
  onScan: (code: string) => void
  /** Result of the last scan, or null before the first scan. */
  result: CheckInResult | null
  disabled?: boolean
}

/**
 * Ticket-code entry for the gate. Submitting validates via the parent, then the
 * input clears and refocuses so a barcode scanner can fire consecutive reads.
 */
export function CheckInScanner({ onScan, result, disabled }: CheckInScannerProps) {
  const [code, setCode] = useState("")
  const [mode, setMode] = useState<ScanMode>("manual")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    onScan(trimmed)
    setCode("")
    inputRef.current?.focus()
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ScanLine className="text-primary" size={22} aria-hidden="true" />
              Soát vé
            </CardTitle>
            <CardDescription className="mt-1.5">
              {mode === "manual"
                ? "Đặt con trỏ vào ô rồi quét mã QR, hoặc gõ mã vé và nhấn Enter."
                : "Hướng camera sau vào mã QR trên vé của người tham dự."}
            </CardDescription>
          </div>

          {/* Dual-mode toggle: camera scanning + manual 8-char entry (SRS USA-02) */}
          <div className="flex rounded-xl border border-border bg-muted p-1" role="tablist" aria-label="Chế độ soát vé">
            {SCAN_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer",
                  mode === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "manual" ? (
          <form className="flex gap-3" onSubmit={handleSubmit}>
            <div className="relative flex-1">
              <ScanLine
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={20}
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="Quét mã QR hoặc nhập mã vé…"
                aria-label="Mã vé"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={disabled}
                autoFocus
                className="h-14 w-full rounded-xl border border-border bg-muted pl-11 pr-4 text-lg tracking-wide text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20 disabled:opacity-50"
              />
            </div>
            <Button type="submit" size="lg" disabled={disabled || !code.trim()} className="h-14 gap-2 px-6 text-base">
              <ScanLine size={18} aria-hidden="true" />
              Check-in
            </Button>
          </form>
        ) : (
          <CameraQrScanner onScan={onScan} />
        )}

        {result && <ResultCard result={result} />}
      </CardContent>
    </Card>
  )
}

/** Colour-coded outcome for the last scan. */
function ResultCard({ result }: { result: CheckInResult }) {
  if (result.status === "success" && result.ticket) {
    const t = result.ticket
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" size={28} aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold text-foreground">Check-in thành công</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{t.attendeeName}</span>
            <Badge variant="success">{t.ticketType}</Badge>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mã vé: {t.code} · Vào lúc {t.checkedInAt}
          </p>
        </div>
      </div>
    )
  }

  if (result.status === "duplicate" && result.ticket) {
    const t = result.ticket
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" size={28} aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-bold text-foreground">Vé đã được sử dụng</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{t.attendeeName}</span>
            <Badge variant="warning">{t.ticketType}</Badge>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Đã check-in trước đó lúc {result.previousTime}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
      role="alert"
      aria-live="assertive"
    >
      <XCircle className="mt-0.5 shrink-0 text-destructive" size={28} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-bold text-foreground">Mã vé không hợp lệ</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Không tìm thấy vé cho sự kiện này. Vui lòng kiểm tra lại mã.
        </p>
      </div>
    </div>
  )
}
