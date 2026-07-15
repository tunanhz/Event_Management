"use client"

import { useEffect, useState, type FormEvent } from "react"
import { TriangleAlert, Send, CheckCircle2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import {
  getMyAssignments,
  createIncident,
  getMyIncidents,
  type StaffAssignment,
  type StaffIncident,
  type IncidentType,
  type IncidentStatus,
} from "@/lib/staff-api"

const INCIDENT_TYPES = [
  { value: "fake-ticket", label: "Nghi vấn vé giả" },
  { value: "duplicate-ticket", label: "Vé trùng / đã sử dụng" },
  { value: "device-error", label: "Lỗi thiết bị quét / hệ thống" },
  { value: "gate-issue", label: "Sự cố tại cổng (an ninh, ùn tắc…)" },
  { value: "other", label: "Sự cố khác" },
] as const

const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  PENDING: "Chờ xử lý",
  IN_REVIEW: "Đang xem xét",
  RESOLVED: "Đã xử lý",
}

const STATUS_VARIANTS: Record<IncidentStatus, "warning" | "secondary" | "success"> = {
  PENDING: "warning",
  IN_REVIEW: "secondary",
  RESOLVED: "success",
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"

/**
 * Gate incident reporting (/staff/incidents): file a report to the organizer
 * and track its status.
 */
export function StaffIncidentsView() {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [incidents, setIncidents] = useState<StaffIncident[]>([])
  const [eventId, setEventId] = useState("")
  const [type, setType] = useState<IncidentType>("fake-ticket")
  const [ticketCode, setTicketCode] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([getMyAssignments(), getMyIncidents()])
      .then(([assigns, incs]) => {
        setAssignments(assigns)
        setIncidents(incs)
        if (assigns.length > 0) {
          setEventId(assigns[0].eventId?._id ?? "")
        }
      })
      .catch((err) => setError(err.message ?? "Không thể tải dữ liệu"))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !eventId) return

    setSubmitting(true)
    setSent(false)
    try {
      const newInc = await createIncident({
        eventId,
        type,
        ticketCode: ticketCode.trim() || undefined,
        description: description.trim(),
      })
      setIncidents((prev) => [newInc, ...prev])
      setTicketCode("")
      setDescription("")
      setSent(true)
    } catch (err: any) {
      alert(err.message ?? "Không thể gửi báo cáo sự cố")
    } finally {
      setSubmitting(false)
    }
  }

  const incidentTypeLabel = (val: IncidentType) => {
    return INCIDENT_TYPES.find((t) => t.value === val)?.label ?? val
  }

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
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* ── Report form ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <TriangleAlert className="text-primary" size={22} aria-hidden="true" />
            Báo cáo sự cố
          </CardTitle>
          <CardDescription>
            Gửi sự cố tại cổng cho ban tổ chức xử lý (vé giả, thiết bị lỗi, ùn tắc…).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Bạn chưa được phân công sự kiện nào để báo cáo sự cố.
            </p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="incident-event" className="text-sm font-semibold text-foreground">
                  Sự kiện <span className="text-destructive">*</span>
                </label>
                <select
                  id="incident-event"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className={inputCls + " cursor-pointer"}
                >
                  {assignments.map((a) => {
                    const ev = a.eventId
                    if (!ev) return null
                    return (
                      <option key={ev._id} value={ev._id}>
                        {ev.title}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="incident-type" className="text-sm font-semibold text-foreground">
                  Loại sự cố <span className="text-destructive">*</span>
                </label>
                <select
                  id="incident-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as IncidentType)}
                  className={inputCls + " cursor-pointer"}
                >
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="incident-ticket" className="text-sm font-semibold text-foreground">
                  Mã vé liên quan
                </label>
                <input
                  id="incident-ticket"
                  type="text"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                  placeholder="Ví dụ: EVB-3F7K-0192 (nếu có)"
                  autoComplete="off"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="incident-description" className="text-sm font-semibold text-foreground">
                  Mô tả sự cố <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="incident-description"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    setSent(false)
                  }}
                  placeholder="Mô tả ngắn gọn điều đã xảy ra và cách bạn đã xử lý tại chỗ…"
                  className="w-full resize-y rounded-xl border border-border bg-muted p-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                disabled={!description.trim() || submitting}
                className="h-11 w-full gap-2 rounded-xl font-semibold cursor-pointer"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={16} aria-hidden="true" />
                )}
                Gửi báo cáo
              </Button>

              {sent && (
                <p
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                  role="status"
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Đã gửi báo cáo tới ban tổ chức.
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── My reports ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Báo cáo của tôi</CardTitle>
          <CardDescription>Theo dõi trạng thái xử lý các sự cố bạn đã gửi.</CardDescription>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Bạn chưa gửi báo cáo sự cố nào.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {incidents.map((inc) => (
                <div key={inc._id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{incidentTypeLabel(inc.type)}</span>
                    <Badge variant={STATUS_VARIANTS[inc.status]}>{INCIDENT_STATUS_LABELS[inc.status]}</Badge>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                      {new Date(inc.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {inc.eventId?.title ?? "Sự kiện không xác định"}
                    {inc.ticketCode && (
                      <>
                        {" "}· Vé <span className="font-mono">{inc.ticketCode}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{inc.description}</p>
                  {inc.resolution && (
                    <div className="mt-2 rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="font-semibold block mb-0.5">Ban tổ chức giải quyết:</span>
                      {inc.resolution}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
