"use client"

import { useState } from "react"
import { Search, Users, CheckCircle2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { nowHHmm, type StaffEvent, type StaffTicket } from "./staff-checkin-data"

type StatusFilter = "all" | "in" | "out"

/**
 * Attendee lookup for the gate: search by name/email/ticket/order code and
 * admit manually when the QR cannot be scanned. Admission is irreversible
 * (business rule), so the row action asks for a second confirming tap.
 */
export function StaffAttendeesView({ event }: { event: StaffEvent }) {
  // Working copy so manual admissions mutate without touching the seed data.
  const [tickets, setTickets] = useState<StaffTicket[]>(() =>
    event.tickets.map((t) => ({ ...t }))
  )
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StatusFilter>("all")
  /** Ticket code awaiting the confirming second tap, if any. */
  const [pendingCode, setPendingCode] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const visible = tickets.filter((t) => {
    if (filter === "in" && !t.checkedInAt) return false
    if (filter === "out" && t.checkedInAt) return false
    if (!q) return true
    return [t.attendeeName, t.email, t.code, t.orderCode]
      .some((field) => field.toLowerCase().includes(q))
  })
  const checkedIn = tickets.filter((t) => t.checkedInAt).length

  const admit = (code: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.code === code && !t.checkedInAt ? { ...t, checkedInAt: nowHHmm() } : t))
    )
    setPendingCode(null)
  }

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: tickets.length },
    { key: "in", label: "Đã vào", count: checkedIn },
    { key: "out", label: "Chưa vào", count: tickets.length - checkedIn },
  ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="text-primary" size={22} aria-hidden="true" />
          Người tham dự
        </CardTitle>
        <CardDescription>
          {event.title} — tra cứu vé và check-in thủ công khi khách không quét được mã QR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search + status filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, email, mã vé hoặc mã đơn…"
              aria-label="Tìm người tham dự"
              className="h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Lọc theo trạng thái">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
                <span className="tabular-nums opacity-80">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Attendee rows */}
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Không tìm thấy người tham dự phù hợp.
          </p>
        ) : (
          <div>
            {visible.map((t) => (
              <div
                key={t.code}
                className="flex flex-wrap items-center gap-3 border-t border-border py-3 first:border-t-0"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary"
                  aria-hidden="true"
                >
                  {t.attendeeName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {t.attendeeName}
                    </span>
                    <Badge variant="outline">{t.ticketType}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.email} · Vé <span className="font-mono">{t.code}</span> · Đơn{" "}
                    <span className="font-mono">{t.orderCode}</span>
                  </div>
                </div>

                {t.checkedInAt ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Đã vào lúc {t.checkedInAt}
                  </Badge>
                ) : pendingCode === t.code ? (
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="h-10 gap-1.5 rounded-lg" onClick={() => admit(t.code)}>
                      <CheckCircle2 size={15} aria-hidden="true" />
                      Xác nhận check-in
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 rounded-lg"
                      aria-label="Hủy"
                      onClick={() => setPendingCode(null)}
                    >
                      <X size={15} aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-lg"
                    onClick={() => setPendingCode(t.code)}
                  >
                    Check-in thủ công
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
