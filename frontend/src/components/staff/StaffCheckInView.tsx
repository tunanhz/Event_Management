"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CalendarClock,
  MapPin,
  CheckCircle2,
  Clock,
  Ticket,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { CheckInScanner } from "./CheckInScanner"
import { CheckInProgressRing } from "./CheckInProgressRing"
import {
  checkIn as apiCheckIn,
  getAttendees,
  getCheckInStats,
  getCheckInHistory,
  type Attendee,
  type CheckInStats,
  type CheckInHistoryEntry,
  type CheckInResult,
} from "@/lib/staff-api"

interface StaffCheckInViewProps {
  eventId: string
  eventTitle?: string
  eventDateTime?: string
  eventVenue?: string
}

/**
 * Staff check-in station for one assigned event.
 * Now uses real backend API instead of mock data.
 */
export function StaffCheckInView({
  eventId,
  eventTitle = "Sự kiện",
  eventDateTime = "",
  eventVenue = "",
}: StaffCheckInViewProps) {
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [history, setHistory] = useState<CheckInHistoryEntry[]>([])
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchData = useCallback(async () => {
    try {
      const [statsData, historyData] = await Promise.all([
        getCheckInStats(eventId),
        getCheckInHistory(eventId),
      ])
      setStats(statsData)
      setHistory(historyData)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải dữ liệu check-in")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleScan = async (raw: string) => {
    // The scanner input should be a registrationId
    const code = raw.trim()
    if (!code) return

    try {
      const res = await apiCheckIn(eventId, code)
      setResult(res)

      // Refresh stats and history on successful check-in
      if (res.status === "SUCCESS") {
        fetchData()
      }
    } catch (err: any) {
      setResult({ status: "INVALID" })
    }
  }

  const recent = useMemo(
    () => history.slice(0, 8),
    [history]
  )

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <p className="font-semibold text-destructive">{error}</p>
      </div>
    )
  }

  const currentStats = stats ?? { total: 0, checkedIn: 0, remaining: 0, percent: 0, byType: [] }

  return (
    <div className="space-y-6">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Soát vé &amp; Check-in
            </h1>
            <p className="mt-1 truncate text-lg font-semibold text-primary">{eventTitle}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {eventDateTime && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock size={15} aria-hidden="true" />
                  {eventDateTime}
                </span>
              )}
              {eventVenue && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} aria-hidden="true" />
                  {eventVenue}
                </span>
              )}
            </div>
          </div>

          <CheckInProgressRing value={currentStats.percent} />
        </div>
      </div>

      {/* ── Live counters ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={CheckCircle2} tone="emerald" value={currentStats.checkedIn} label="Đã check-in" />
        <StatCard icon={Clock} tone="amber" value={currentStats.remaining} label="Chưa vào" />
        <StatCard icon={Ticket} tone="primary" value={currentStats.total} label="Tổng vé đã bán" />
      </div>

      {/* ── Scanner + side panels ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CheckInScanner onScan={handleScan} result={result as any} />

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Theo loại vé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStats.byType.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có dữ liệu loại vé.
                </p>
              ) : (
                currentStats.byType.map((t) => {
                  const pct = t.total ? Math.round((t.checkedIn / t.total) * 100) : 0
                  return (
                    <div key={t.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-foreground">{t.type}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {t.checkedIn} / {t.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Check-in gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Chưa có lượt check-in nào.
                </p>
              ) : (
                <div>
                  {recent.map((entry) => (
                    <div
                      key={entry.checkInId}
                      className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary"
                        aria-hidden="true"
                      >
                        {entry.attendeeName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {entry.attendeeName}
                        </div>
                        <div className="text-xs text-muted-foreground">{entry.ticketType}</div>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {new Date(entry.checkInTime).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const TONES: Record<string, { chip: string; icon: string }> = {
  emerald: { chip: "bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400" },
  amber: { chip: "bg-amber-500/15", icon: "text-amber-600 dark:text-amber-400" },
  primary: { chip: "bg-primary/12", icon: "text-primary" },
}

/** Compact counter tile with an icon chip. */
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
