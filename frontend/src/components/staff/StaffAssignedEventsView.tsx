"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CalendarClock, MapPin, Clock, BadgeCheck, ScanLine,
  Users, History, CheckCheck, Loader2, AlertCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { fetchMyAssignments, confirmAssignment, type StaffAssignment } from "@/lib/staff-api"

/**
 * Staff landing page (/staff): every event the staff member is assigned to
 * with shift details and shortcuts into the check-in station.
 * Now fetches real assignments from the backend.
 */
export function StaffAssignedEventsView() {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    fetchMyAssignments()
      .then(setAssignments)
      .catch((err) => setError(err.message ?? "Không thể tải danh sách ca trực"))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirm = async (assignmentId: string) => {
    setConfirming(assignmentId)
    try {
      const updated = await confirmAssignment(assignmentId)
      setAssignments((prev) =>
        prev.map((a) => (a._id === assignmentId ? updated : a))
      )
    } catch (err: any) {
      fetchMyAssignments().then(setAssignments).catch(() => undefined)
      alert(err.message ?? "Xác nhận thất bại")
    } finally {
      setConfirming(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
        <AlertCircle className="text-destructive" size={32} />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
      </div>
    )
  }

  const todayCount = assignments.filter((a) => {
    const event = typeof a.eventId === "object" ? a.eventId : null
    const eventStart = event?.startDate ?? event?.date
    if (!eventStart) return false
    const d = new Date(eventStart)
    const today = new Date()
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  }).length

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Sự kiện được phân công
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nhiệm vụ của bạn do quản trị viên phân công. Chọn sự kiện để vào trạm check-in.
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
            const event = typeof assignment.eventId === "object" ? assignment.eventId : null
            const eventId = event?._id ?? (assignment.eventId as string)
            const base = `/staff/check-in/${eventId}`
            const isAwaitingConfirmation = assignment.status === "assigned"
            const isConfirmed = assignment.status === "confirmed"
            const eventStart = event?.startDate ?? event?.date
            const confirmationDeadline = eventStart
              ? new Date(new Date(eventStart).getTime() - 60 * 60 * 1000)
              : null
            const statusLabel = assignment.status === "assigned"
              ? "Chờ xác nhận"
              : assignment.status === "confirmed"
                ? "Đã xác nhận"
                : assignment.status === "completed"
                  ? "Đã hoàn thành"
                  : assignment.status === "expired"
                    ? "Không làm – quá hạn"
                    : "Đã hủy"
            const statusVariant = assignment.status === "assigned"
              ? "warning"
              : assignment.status === "cancelled" || assignment.status === "expired"
                ? "destructive"
                : assignment.status === "confirmed"
                  ? "success"
                  : "secondary"

            return (
              <article
                key={assignment._id}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">
                        {event?.title ?? "Sự kiện"}
                      </h2>
                      <Badge variant={statusVariant}>
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {eventStart && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock size={15} aria-hidden="true" />
                          {new Date(eventStart).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                      {event?.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={15} aria-hidden="true" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Duty details */}
                <div className="mt-4 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-foreground">
                    <BadgeCheck size={15} className="text-primary" aria-hidden="true" />
                    {assignment.note || "Chưa có ghi chú nhiệm vụ"}
                  </span>
                </div>

                {isAwaitingConfirmation && confirmationDeadline && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle size={15} aria-hidden="true" />
                    Xác nhận trước {confirmationDeadline.toLocaleString("vi-VN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}; quá hạn sẽ được ghi nhận là không làm.
                  </p>
                )}
                {assignment.status === "expired" && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle size={15} aria-hidden="true" />
                    Ca này đã quá hạn xác nhận và không còn quyền vận hành sự kiện.
                  </p>
                )}

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  {isConfirmed && (
                    <>
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
                    </>
                  )}
                  {isAwaitingConfirmation && (
                    <Button
                      variant="outline"
                      className="h-11 gap-2 rounded-xl border-emerald-500/40 px-4 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-500/10 dark:text-emerald-400"
                      disabled={confirming === assignment._id}
                      onClick={() => handleConfirm(assignment._id)}
                    >
                      {confirming === assignment._id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCheck size={16} aria-hidden="true" />
                      )}
                      Xác nhận ca
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
