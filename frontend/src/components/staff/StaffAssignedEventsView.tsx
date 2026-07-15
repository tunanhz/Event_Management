"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, MapPin, Clock, DoorOpen, BadgeCheck, ScanLine, Users, History, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { getMyAssignments, type StaffAssignment } from "@/lib/staff-api"
import { formatDate } from "@/lib/utils"

/**
 * Staff landing page (/staff): every event the staff member is assigned to
 * work, with shift details and a shortcut into the check-in station.
 */
export function StaffAssignedEventsView() {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getMyAssignments()
      .then(setAssignments)
      .catch((err) => setError(err.message ?? "Không thể tải danh sách sự kiện"))
      .finally(() => setLoading(false))
  }, [])

  // Determine timing based on event dates
  const getTimingLabel = (event: any) => {
    if (!event) return { label: "Sắp diễn ra", variant: "secondary" as const }
    const now = new Date()
    const start = new Date(event.startDate || event.date)
    const end = event.endDate ? new Date(event.endDate) : start

    if (now >= start && now <= end) return { label: "Hôm nay", variant: "success" as const }
    if (start.toDateString() === now.toDateString()) return { label: "Hôm nay", variant: "success" as const }
    return { label: "Sắp diễn ra", variant: "secondary" as const }
  }

  const todayCount = assignments.filter((a) => {
    const event = a.eventId
    if (!event) return false
    return getTimingLabel(event).label === "Hôm nay"
  }).length

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
            {assignments.length} sự kiện được giao
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
      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-semibold text-foreground">Bạn chưa được phân công sự kiện nào.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Khi ban tổ chức phân công, ca trực sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const event = assignment.eventId
            if (!event || !event._id) return null
            const timing = getTimingLabel(event)
            const eventId = event._id
            const base = `/staff/check-in/${eventId}`

            const eventDate = event.startDate || event.date
            const dateStr = eventDate ? formatDate(eventDate) : "Chưa xác định"

            return (
              <article
                key={assignment._id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">{event.title}</h2>
                      <Badge variant={timing.variant}>
                        {timing.label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock size={15} aria-hidden="true" />
                        {dateStr}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={15} aria-hidden="true" />
                        {event.location || "Chưa xác định"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Duty details */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <BadgeCheck size={15} className="text-primary" aria-hidden="true" />
                    {assignment.roleInEvent}
                  </span>
                  {assignment.gate && (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <DoorOpen size={15} aria-hidden="true" />
                      {assignment.gate}
                    </span>
                  )}
                  {assignment.shift && (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock size={15} aria-hidden="true" />
                      Ca trực {assignment.shift}
                    </span>
                  )}
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
