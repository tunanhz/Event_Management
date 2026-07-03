"use client"

import { useMemo, useState } from "react"
import {
  ChevronDown,
  CalendarClock,
  MapPin,
  CheckCircle2,
  Clock,
  Ticket,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { CheckInScanner } from "./CheckInScanner"
import { CheckInProgressRing } from "./CheckInProgressRing"
import {
  STAFF_EVENTS,
  normalizeCode,
  summarizeTickets,
  breakdownByType,
  type StaffTicket,
  type CheckInResult,
} from "./staff-checkin-data"

/** Current wall-clock time as "HH:mm" (called from an event handler only). */
function nowHHmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/**
 * Staff check-in station. Pick an assigned event, scan/enter ticket codes to
 * admit attendees, and watch live counters + a recent-admissions feed.
 */
export function StaffCheckInView() {
  const [eventId, setEventId] = useState(STAFF_EVENTS[0].id)
  // Ticket state is a working copy so admissions mutate without touching seed.
  const [tickets, setTickets] = useState<StaffTicket[]>(() =>
    STAFF_EVENTS[0].tickets.map((t) => ({ ...t }))
  )
  const [result, setResult] = useState<CheckInResult | null>(null)

  const event = STAFF_EVENTS.find((e) => e.id === eventId) ?? STAFF_EVENTS[0]
  const stats = summarizeTickets(tickets)
  const types = breakdownByType(tickets)
  const recent = useMemo(
    () =>
      tickets
        .filter((t) => t.checkedInAt)
        .sort((a, b) => (b.checkedInAt ?? "").localeCompare(a.checkedInAt ?? ""))
        .slice(0, 8),
    [tickets]
  )

  const selectEvent = (id: string) => {
    const ev = STAFF_EVENTS.find((e) => e.id === id)
    setEventId(id)
    setTickets(ev ? ev.tickets.map((t) => ({ ...t })) : [])
    setResult(null)
  }

  const handleScan = (raw: string) => {
    const code = normalizeCode(raw)
    const idx = tickets.findIndex((t) => normalizeCode(t.code) === code)
    if (idx === -1) {
      setResult({ status: "invalid" })
      return
    }
    const ticket = tickets[idx]
    if (ticket.checkedInAt) {
      setResult({ status: "duplicate", ticket, previousTime: ticket.checkedInAt })
      return
    }
    const admitted = { ...ticket, checkedInAt: nowHHmm() }
    const next = [...tickets]
    next[idx] = admitted
    setTickets(next)
    setResult({ status: "success", ticket: admitted })
  }

  return (
    <div className="space-y-6">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Soát vé &amp; Check-in
            </h1>
            <p className="mt-1 truncate text-lg font-semibold text-primary">{event.title}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={15} aria-hidden="true" />
                {event.dateTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} aria-hidden="true" />
                {event.venueName}
              </span>
            </div>

            <div className="relative mt-4 w-full max-w-xs">
              <select
                value={eventId}
                onChange={(e) => selectEvent(e.target.value)}
                aria-label="Chọn sự kiện"
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-border bg-card pl-4 pr-10 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/20"
              >
                {STAFF_EVENTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </div>

          <CheckInProgressRing value={stats.percent} />
        </div>
      </div>

      {/* ── Live counters ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={CheckCircle2} tone="emerald" value={stats.checkedIn} label="Đã check-in" />
        <StatCard icon={Clock} tone="amber" value={stats.remaining} label="Chưa vào" />
        <StatCard icon={Ticket} tone="primary" value={stats.total} label="Tổng vé đã bán" />
      </div>

      {/* ── Scanner + side panels ───────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CheckInScanner onScan={handleScan} result={result} />

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Theo loại vé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {types.map((t) => {
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
              })}
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
                  {recent.map((t) => (
                    <div
                      key={t.code}
                      className="flex items-center gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0"
                    >
                      <span
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary"
                        aria-hidden="true"
                      >
                        {t.attendeeName.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {t.attendeeName}
                        </div>
                        <div className="text-xs text-muted-foreground">{t.ticketType}</div>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {t.checkedInAt}
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
