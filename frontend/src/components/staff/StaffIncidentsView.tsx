"use client"

import { useRef, useState, type FormEvent } from "react"
import { TriangleAlert, Send, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { STAFF_EVENTS, getStaffEventById, nowHHmm } from "./staff-checkin-data"
import {
  INCIDENT_TYPES,
  INCIDENT_STATUS_LABELS,
  STAFF_INCIDENTS,
  incidentTypeLabel,
  type IncidentStatus,
  type IncidentTypeValue,
  type StaffIncident,
} from "./staff-incidents-data"

const STATUS_VARIANTS: Record<IncidentStatus, "warning" | "secondary" | "success"> = {
  PENDING: "warning",
  IN_REVIEW: "secondary",
  RESOLVED: "success",
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"

/**
 * Gate incident reporting (/staff/incidents): file a report to the organizer
 * (fake/duplicate ticket, device error, gate issue…) and track its status.
 */
export function StaffIncidentsView() {
  const [incidents, setIncidents] = useState<StaffIncident[]>(STAFF_INCIDENTS)
  const [eventId, setEventId] = useState(STAFF_EVENTS[0]?.id ?? "")
  const [type, setType] = useState<IncidentTypeValue>(INCIDENT_TYPES[0].value)
  const [ticketCode, setTicketCode] = useState("")
  const [description, setDescription] = useState("")
  const [sent, setSent] = useState(false)
  const nextId = useRef(100)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    nextId.current += 1
    const report: StaffIncident = {
      id: `inc-local-${nextId.current}`,
      eventId,
      type,
      ticketCode: ticketCode.trim() || undefined,
      description: description.trim(),
      createdAt: `${nowHHmm()} · hôm nay`,
      status: "PENDING",
    }
    setIncidents((prev) => [report, ...prev])
    setTicketCode("")
    setDescription("")
    setSent(true)
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
                {STAFF_EVENTS.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="incident-type" className="text-sm font-semibold text-foreground">
                Loại sự cố <span className="text-destructive">*</span>
              </label>
              <select
                id="incident-type"
                value={type}
                onChange={(e) => setType(e.target.value as IncidentTypeValue)}
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

            <Button type="submit" disabled={!description.trim()} className="h-11 w-full gap-2 rounded-xl font-semibold">
              <Send size={16} aria-hidden="true" />
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
            <div>
              {incidents.map((inc) => (
                <div key={inc.id} className="border-t border-border py-3.5 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{incidentTypeLabel(inc.type)}</span>
                    <Badge variant={STATUS_VARIANTS[inc.status]}>{INCIDENT_STATUS_LABELS[inc.status]}</Badge>
                    <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                      {inc.createdAt}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {getStaffEventById(inc.eventId)?.title ?? "Sự kiện không xác định"}
                    {inc.ticketCode && (
                      <>
                        {" "}· Vé <span className="font-mono">{inc.ticketCode}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
