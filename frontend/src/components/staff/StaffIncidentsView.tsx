"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { TriangleAlert, Send, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import {
  createIncident,
  fetchMyIncidents,
  fetchMyAssignments,
  type IncidentReport,
  type IncidentSeverity,
  type IncidentCategory,
  type StaffAssignment,
} from "@/lib/staff-api"

// ─── Config labels ────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; color: string }[] = [
  { value: "LOW", label: "Thấp", color: "secondary" },
  { value: "MEDIUM", label: "Trung bình", color: "warning" },
  { value: "HIGH", label: "Cao", color: "destructive" },
  { value: "CRITICAL", label: "Khẩn cấp 🚨", color: "destructive" },
]

const CATEGORY_OPTIONS: { value: IncidentCategory; label: string }[] = [
  { value: "security", label: "An ninh" },
  { value: "crowd_control", label: "Kiểm soát đám đông" },
  { value: "equipment", label: "Thiết bị hỏng" },
  { value: "medical", label: "Y tế" },
  { value: "ticket_dispute", label: "Tranh chấp vé" },
  { value: "other", label: "Khác" },
]

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Đang chờ",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
}

type BadgeVariant = "warning" | "secondary" | "success" | "destructive"

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  OPEN: "warning",
  IN_PROGRESS: "secondary",
  RESOLVED: "success",
  CLOSED: "secondary",
}

const SEVERITY_BADGE: Record<IncidentSeverity, BadgeVariant> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
  CRITICAL: "destructive",
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"

/**
 * Gate incident reporting (/staff/incidents).
 * Files reports via POST /api/staff/incidents and loads history via GET /api/staff/incidents.
 */
export function StaffIncidentsView() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Form state
  const [eventId, setEventId] = useState("")
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM")
  const [category, setCategory] = useState<IncidentCategory>("other")
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetchMyAssignments(),
      fetchMyIncidents({ limit: 30 }),
    ])
      .then(([myAssignments, { data }]) => {
        const confirmedAssignments = myAssignments.filter((assignment) => assignment.status === "confirmed")
        setAssignments(confirmedAssignments)
        setIncidents(data)
        if (confirmedAssignments[0]) {
          const ev = typeof confirmedAssignments[0].eventId === "object"
            ? confirmedAssignments[0].eventId._id
            : confirmedAssignments[0].eventId as string
          setEventId(ev)
        }
      })
      .catch((err) => setHistoryError(err.message ?? "Không thể tải dữ liệu"))
      .finally(() => setLoadingHistory(false))
  }, [])

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !location.trim() || !eventId) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const created = await createIncident({
        eventId,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        severity,
        category,
      })
      setIncidents((prev) => [created, ...prev])
      setTitle("")
      setLocation("")
      setDescription("")
      setSent(true)
    } catch (err: any) {
      setSubmitError(err.message ?? "Gửi báo cáo thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getEventTitle = (incident: IncidentReport) => {
    const ev = incident.eventId
    return typeof ev === "object" ? ev.title : ev
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
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Sự kiện */}
            <div className="space-y-1.5">
              <label htmlFor="incident-event" className="text-sm font-semibold text-foreground">
                Sự kiện <span className="text-destructive">*</span>
              </label>
              <select
                id="incident-event"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className={inputCls + " cursor-pointer"}
                required
              >
                <option value="">-- Chọn sự kiện --</option>
                {assignments.map((a) => {
                  const ev = typeof a.eventId === "object" ? a.eventId : null
                  const id = ev?._id ?? (a.eventId as string)
                  return (
                    <option key={a._id} value={id}>
                      {ev?.title ?? id}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Tiêu đề */}
            <div className="space-y-1.5">
              <label htmlFor="incident-title" className="text-sm font-semibold text-foreground">
                Tiêu đề <span className="text-destructive">*</span>
              </label>
              <input
                id="incident-title"
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setSent(false) }}
                placeholder="Ví dụ: Vé QR bị trùng tại Cổng A"
                className={inputCls}
                required
              />
            </div>

            {/* Vị trí */}
            <div className="space-y-1.5">
              <label htmlFor="incident-location" className="text-sm font-semibold text-foreground">
                Vị trí xảy ra <span className="text-destructive">*</span>
              </label>
              <input
                id="incident-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Cổng A, Khu VIP, Sân khấu chính…"
                className={inputCls}
                required
              />
            </div>

            {/* Loại sự cố + Mức độ (2 cột) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="incident-category" className="text-sm font-semibold text-foreground">
                  Loại sự cố
                </label>
                <select
                  id="incident-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                  className={inputCls + " cursor-pointer"}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="incident-severity" className="text-sm font-semibold text-foreground">
                  Mức độ
                </label>
                <select
                  id="incident-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                  className={inputCls + " cursor-pointer"}
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <label htmlFor="incident-description" className="text-sm font-semibold text-foreground">
                Mô tả chi tiết <span className="text-destructive">*</span>
              </label>
              <textarea
                id="incident-description"
                rows={4}
                value={description}
                onChange={(e) => { setDescription(e.target.value); setSent(false) }}
                placeholder="Mô tả ngắn gọn điều đã xảy ra và cách bạn đã xử lý tại chỗ…"
                className="w-full resize-y rounded-xl border border-border bg-muted p-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
                required
              />
            </div>

            {submitError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle size={15} />
                {submitError}
              </p>
            )}

            <Button
              type="submit"
              disabled={!title.trim() || !description.trim() || !location.trim() || !eventId || submitting}
              className="h-11 w-full gap-2 rounded-xl font-semibold"
            >
              {submitting
                ? <Loader2 size={16} className="animate-spin" />
                : <Send size={16} aria-hidden="true" />
              }
              Gửi báo cáo
            </Button>

            {sent && (
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400" role="status">
                <CheckCircle2 size={15} aria-hidden="true" />
                Đã gửi báo cáo tới ban tổ chức.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── My reports ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Báo cáo của tôi</CardTitle>
          <CardDescription>Theo dõi trạng thái xử lý các sự cố bạn đã gửi.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          ) : historyError ? (
            <p className="py-4 text-center text-sm text-destructive">{historyError}</p>
          ) : incidents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Bạn chưa gửi báo cáo sự cố nào.
            </p>
          ) : (
            <div>
              {incidents.map((inc) => (
                <div key={inc._id} className="border-t border-border py-3.5 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{inc.title}</span>
                    <Badge variant={SEVERITY_BADGE[inc.severity]}>{inc.severity}</Badge>
                    <Badge variant={STATUS_VARIANTS[inc.status]}>{STATUS_LABELS[inc.status]}</Badge>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                      {new Date(inc.createdAt).toLocaleString("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {getEventTitle(inc)} · {inc.location}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{inc.description}</p>
                  {inc.resolvedNote && (
                    <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      ✓ {inc.resolvedNote}
                    </p>
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
