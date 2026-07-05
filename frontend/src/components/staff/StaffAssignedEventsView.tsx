"use client"

import Link from "next/link"
import { CalendarClock, MapPin, Clock, DoorOpen, BadgeCheck, ScanLine, Users, History } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { STAFF_EVENTS, summarizeTickets } from "./staff-checkin-data"
import { STAFF_ASSIGNMENTS, TIMING_LABELS } from "./staff-assignments-data"

/**
 * Staff landing page (/staff): every event the staff member is assigned to
 * work, with shift details and a shortcut into the check-in station.
 */
export function StaffAssignedEventsView() {
  const rows = STAFF_ASSIGNMENTS.flatMap((assignment) => {
    const event = STAFF_EVENTS.find((e) => e.id === assignment.eventId)
    return event ? [{ assignment, event }] : []
  })
  const todayCount = rows.filter((r) => r.assignment.timing === "today").length

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Sự kiện được phân công
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ca trực soát vé của bạn do ban tổ chức phân công. Chọn sự kiện để vào trạm check-in.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
            <BadgeCheck size={14} aria-hidden="true" />
            {rows.length} sự kiện được giao
          </span>
          {todayCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Clock size={14} aria-hidden="true" />
              {todayCount} ca trực hôm nay
            </span>
          )}
        </div>
      </div>

      {/* ── Assignment cards ────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-semibold text-foreground">Bạn chưa được phân công sự kiện nào.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Khi ban tổ chức phân công, ca trực sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(({ assignment, event }) => {
            const stats = summarizeTickets(event.tickets)
            const base = `/staff/check-in/${event.id}`
            return (
              <article
                key={event.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{event.title}</h2>
                      <Badge variant={assignment.timing === "today" ? "success" : "secondary"}>
                        {TIMING_LABELS[assignment.timing]}
                      </Badge>
                    </div>
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
                  </div>

                  {/* Check-in progress */}
                  <div className="w-full shrink-0 sm:w-48">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Đã check-in</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {stats.checkedIn}/{stats.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${stats.percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Duty details */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <BadgeCheck size={15} className="text-primary" aria-hidden="true" />
                    {assignment.responsibility}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <DoorOpen size={15} aria-hidden="true" />
                    {assignment.gate}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock size={15} aria-hidden="true" />
                    Ca trực {assignment.shift}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button asChild className="h-11 gap-2 rounded-xl px-5 font-semibold">
                    <Link href={base}>
                      <ScanLine size={17} aria-hidden="true" />
                      Vào trạm check-in
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 gap-2 rounded-xl px-4">
                    <Link href={`${base}/attendees`}>
                      <Users size={16} aria-hidden="true" />
                      Người tham dự
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 gap-2 rounded-xl px-4">
                    <Link href={`${base}/history`}>
                      <History size={16} aria-hidden="true" />
                      Lịch sử
                    </Link>
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
