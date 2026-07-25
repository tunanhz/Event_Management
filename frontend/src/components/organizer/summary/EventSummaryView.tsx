"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ShieldAlert, Loader2, MapPin, User, Clock } from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import { clientApi } from "@/lib/client-api"
import { Badge } from "@/components/ui/badge"
import {
  summarizeEvent,
  formatVnd,
  formatInt,
  type OrganizerEvent,
} from "../my-events-data"
import { fetchEventSalesSeries, type SalesSeriesPoint } from "../analytics/organizer-analytics-api"
import { useWorkspaceEvent } from "../EventWorkspaceContext"
import { EventShowHeader } from "../shared/EventShowHeader"
import { DonutStatCard } from "../shared/DonutStatCard"
import { SummaryChart } from "./SummaryChart"
import { TicketSalesTable } from "./TicketSalesTable"
import styles from "./summary.module.css"

type Range = "24h" | "30d"

interface StaffIncident {
  _id: string
  title: string
  description: string
  location: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  category: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  staffId?: {
    fullName?: string
    email?: string
    phone?: string
  }
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

const CATEGORY_LABELS: Record<string, string> = {
  security: "An ninh",
  crowd_control: "Ùn tắc / Đám đông",
  equipment: "Thiết bị / Kỹ thuật",
  medical: "Y tế",
  ticket_dispute: "Tranh chấp vé",
  other: "Khác",
}

const SEVERITY_BADGES: Record<string, { label: string; variant: "destructive" | "warning" | "secondary" | "outline" }> = {
  CRITICAL: { label: "Khẩn cấp 🚨", variant: "destructive" },
  HIGH: { label: "Cao", variant: "warning" },
  MEDIUM: { label: "Trung bình", variant: "secondary" },
  LOW: { label: "Thấp", variant: "outline" },
}

const STATUS_BADGES: Record<string, { label: string; variant: "warning" | "success" | "secondary" | "outline" }> = {
  OPEN: { label: "Đang chờ", variant: "warning" },
  IN_PROGRESS: { label: "Đang xử lý", variant: "secondary" },
  RESOLVED: { label: "Đã xử lý", variant: "success" },
  CLOSED: { label: "Đã đóng", variant: "outline" },
}

function StaffIncidentsSection({ eventId }: { eventId: string }) {
  const [incidents, setIncidents] = useState<StaffIncident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clientApi
      .get<ApiEnvelope<StaffIncident[]>>(`/organizer/events/${eventId}/incidents`)
      .then((res) => setIncidents(res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
        Đang tải báo cáo sự cố từ staff...
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-bold text-foreground">Báo cáo sự cố từ Staff</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Danh sách các sự cố / vấn đề phát sinh tại sự kiện do Nhân viên soát vé ghi nhận và gửi lên Ban tổ chức.
      </p>

      {incidents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          <ShieldAlert className="mx-auto h-8 w-8 opacity-40 mb-2 text-emerald-500" />
          <p>Chưa có báo cáo sự cố nào được ghi nhận cho sự kiện này.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Staff báo cáo</th>
                <th className="px-4 py-3">Tiêu đề &amp; Nội dung sự cố</th>
                <th className="px-4 py-3">Loại sự cố</th>
                <th className="px-4 py-3">Vị trí xảy ra</th>
                <th className="px-4 py-3">Mức độ</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {incidents.map((inc) => {
                const sev = SEVERITY_BADGES[inc.severity] || { label: inc.severity, variant: "secondary" }
                const st = STATUS_BADGES[inc.status] || { label: inc.status, variant: "outline" }
                const catLabel = CATEGORY_LABELS[inc.category] || inc.category || "Khác"
                const staff = inc.staffId

                return (
                  <tr key={inc._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        {staff?.fullName || "Staff"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{staff?.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-bold text-foreground text-sm">{inc.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line line-clamp-3">
                        {inc.description}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="inline-flex items-center text-xs text-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                        {catLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className="inline-flex items-center gap-1 text-xs text-foreground font-medium">
                        <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {inc.location}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <Badge variant={sev.variant}>{sev.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(inc.createdAt)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** "Tổng kết" content: header, overview donuts, chart + detail.
 *  The "Đổi suất diễn" switcher scopes every figure to one show's tiers. */
export function EventSummaryView({ event }: { event: OrganizerEvent }) {
  const { selectedShowId } = useWorkspaceEvent()
  const [range, setRange] = useState<Range>("30d")
  const [series, setSeries] = useState<SalesSeriesPoint[]>([])
  const [loadingSeries, setLoadingSeries] = useState(true)

  // Per-show scope: keep only the selected show's tiers before aggregating.
  const scopedEvent = useMemo<OrganizerEvent>(
    () =>
      selectedShowId
        ? {
            ...event,
            ticketTypes: (event.ticketTypes ?? []).filter((t) => t.showId === selectedShowId),
          }
        : event,
    [event, selectedShowId]
  )

  const summary = useMemo(() => summarizeEvent(scopedEvent), [scopedEvent])
  const types = scopedEvent.ticketTypes ?? []

  useEffect(() => {
    let active = true
    fetchEventSalesSeries(event.id, range, selectedShowId)
      .then((data) => active && setSeries(data))
      .catch(() => active && setSeries([]))
      .finally(() => active && setLoadingSeries(false))
    return () => {
      active = false
    }
  }, [event.id, range, selectedShowId])

  return (
    <>
      <EventShowHeader />

      <h2 className={styles.pageHeading}>Doanh thu</h2>

      <h3 className={styles.sectionLabel}>Tổng quan</h3>
      <div className={styles.overviewGrid}>
        <DonutStatCard
          label="Doanh thu"
          value={formatVnd(summary.soldRevenue)}
          caption={`Tổng: ${formatVnd(summary.totalRevenue)}`}
          percent={summary.revenuePct}
        />
        <DonutStatCard
          label="Số vé đã bán"
          value={`${formatInt(summary.soldTickets)} vé`}
          caption={`Tổng: ${formatInt(summary.totalTickets)} vé`}
          percent={summary.ticketsPct}
        />
      </div>

      <div className={styles.chartHeaderRow}>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.dot} style={{ background: "#a855f7" }} />
            Doanh thu
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dot} style={{ background: "#10b981" }} />
            Số vé bán
          </span>
        </div>
        <div className={styles.rangeToggle}>
          <button
            type="button"
            className={cn(styles.rangeBtn, range === "24h" && styles.rangeBtnActive)}
            onClick={() => setRange("24h")}
          >
            24 giờ
          </button>
          <button
            type="button"
            className={cn(styles.rangeBtn, range === "30d" && styles.rangeBtnActive)}
            onClick={() => setRange("30d")}
          >
            30 ngày
          </button>
        </div>
      </div>

      {loadingSeries && series.length === 0 ? (
        <div
          className={styles.chartWrap}
          style={{ display: "grid", placeItems: "center", color: "var(--muted-foreground)", fontSize: "0.9rem" }}
        >
          Đang tải dữ liệu doanh thu…
        </div>
      ) : (
        <SummaryChart data={series} />
      )}

      <h3 className={styles.sectionLabel}>Chi tiết</h3>
      <p className={styles.subLabel}>Vé đã bán</p>
      <TicketSalesTable types={types} />

      {/* Staff Incident Reports Section */}
      <StaffIncidentsSection eventId={event.id} />
    </>
  )
}
