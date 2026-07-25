"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { CalendarClock, MapPin, CheckCircle2, Clock, Ticket, type LucideIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { CheckInScanner } from "./CheckInScanner"
import { CheckInProgressRing } from "./CheckInProgressRing"
import { normalizeCode, type CheckInResult } from "./staff-checkin-data"
import {
  checkInTicket,
  fetchCheckInStats,
  type CheckInStats,
  type CheckInResult as ApiCheckInResult,
  type CheckInResponse,
} from "@/lib/staff-api"

// Re-use the existing CheckInResult type shape for scanner feedback
type ScanResult = CheckInResult | null

/** Map API response → legacy CheckInResult shape that CheckInScanner expects */
function formatScanTime(value?: string): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function mapToScannerResult(response: CheckInResponse, code: string): CheckInResult {
  const statusMap: Record<ApiCheckInResult, CheckInResult["status"]> = {
    success: "success",
    duplicate: "duplicate",
    invalid: "invalid",
    wrong_event: "invalid",
    cancelled: "invalid",
  }
  const status = statusMap[response.result] ?? "invalid"
  if (status === "invalid") return { status, message: response.message }

  return {
    status,
    ticket: {
      code: code.trim().toUpperCase(),
      attendeeName: response.attendeeName ?? "Người tham dự",
      email: "",
      orderCode: "",
      ticketType: response.ticketName ?? "Vé sự kiện",
      checkedInAt: formatScanTime(response.checkedInAt),
    },
    previousTime: formatScanTime(response.previousCheckedInAt) ?? undefined,
  }
}

const POLL_INTERVAL_MS = 15_000 // Refresh stats every 15s

/**
 * Staff check-in station for one assigned event.
 * Replaces mock data with real API calls:
 *  - POST /api/staff/check-in   → scan a ticket
 *  - GET  /api/staff/events/:id/checkin-stats → live counters
 */
export function StaffCheckInView({ eventId }: { eventId: string }) {
  const checkingRef = useRef(false)
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ScanResult>(null)
  const [recentScans, setRecentScans] = useState<Array<{
    code: string
    result: ApiCheckInResult
    message: string
    checkedInAt?: string
  }>>([])

  // ── Load live stats ──────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      const s = await fetchCheckInStats(eventId)
      setStats(s)
    } catch {
      // Silently ignore poll errors — don't disrupt scanning
    } finally {
      setStatsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadStats])

  // ── Handle scan ──────────────────────────────────────────────────────────
  const handleScan = async (raw: string) => {
    if (checkingRef.current) return
    checkingRef.current = true
    setChecking(true)
    const code = normalizeCode(raw)

    try {
      const response = await checkInTicket({ ticketCode: code, eventId })
      setResult(mapToScannerResult(response, code))

      // Push to recent feed
      setRecentScans((prev) => [
        { code, ...response },
        ...prev.slice(0, 7),
      ])

      // Optimistically update counter on success
      if (response.result === "success") {
        setStats((prev) =>
          prev
            ? {
                ...prev,
                checkedIn: prev.checkedIn + 1,
                remaining: prev.remaining - 1,
                percent: prev.total > 0 ? Math.round(((prev.checkedIn + 1) / prev.total) * 100) : 0,
              }
            : prev
        )
      }
    } catch (error) {
      setResult({
        status: "invalid",
        message: error instanceof Error ? error.message : "Không thể kiểm tra mã vé.",
      })
    } finally {
      checkingRef.current = false
      setChecking(false)
    }
  }

  const pct = stats?.percent ?? 0

  return (
    <div className="space-y-6">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Soát vé &amp; Check-in
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sự kiện ID: <span className="font-mono text-primary">{eventId}</span>
            </p>
          </div>

          {statsLoading ? (
            <Loader2 className="animate-spin text-primary" size={32} />
          ) : (
            <CheckInProgressRing value={pct} />
          )}
        </div>
      </div>

      {/* ── Live counters ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={CheckCircle2} tone="emerald" value={stats?.checkedIn ?? 0} label="Đã check-in" />
        <StatCard icon={Clock} tone="amber" value={stats?.remaining ?? 0} label="Chưa vào" />
        <StatCard icon={Ticket} tone="primary" value={stats?.total ?? 0} label="Tổng vé đã bán" />
      </div>

      {/* ── Scanner + recent feed ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CheckInScanner onScan={handleScan} result={result} disabled={checking} />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Check-in gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Chưa có lượt check-in nào.
              </p>
            ) : (
              <div>
                {recentScans.map((s, idx) => (
                  <div
                    key={`${s.code}-${idx}`}
                    className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold",
                        s.result === "success"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : s.result === "duplicate"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-destructive/15 text-destructive"
                      )}
                      aria-hidden="true"
                    >
                      {s.result === "success" ? "✓" : s.result === "duplicate" ? "⚠" : "✗"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs font-semibold text-foreground">
                        {s.code}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.message}</div>
                    </div>
                    {s.checkedInAt && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(s.checkedInAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const TONES: Record<string, { chip: string; icon: string }> = {
  emerald: { chip: "bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400" },
  amber: { chip: "bg-amber-500/15", icon: "text-amber-600 dark:text-amber-400" },
  primary: { chip: "bg-primary/12", icon: "text-primary" },
}

function StatCard({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: LucideIcon
  tone: keyof typeof TONES | string
  value: number
  label: string
}) {
  const t = TONES[tone] ?? TONES.primary
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", t.chip)} aria-hidden="true">
        <Icon size={22} className={t.icon} />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold tabular-nums text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
