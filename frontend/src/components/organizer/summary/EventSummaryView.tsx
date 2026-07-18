"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
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

  // Real PAID sales per day (30d) / hour (24h) from the backend — replaces the
  // old synthetic ramp. Re-fetches when the range or the selected show changes.
  // `loadingSeries` starts true for the first-load placeholder; on later
  // refetches it stays false so the previous chart stays visible (no flicker).
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
    </>
  )
}
