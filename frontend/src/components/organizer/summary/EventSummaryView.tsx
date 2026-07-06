"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  summarizeEvent,
  buildSummarySeries,
  formatVnd,
  formatInt,
  type OrganizerEvent,
} from "../my-events-data"
import { EventShowHeader } from "../shared/EventShowHeader"
import { DonutStatCard } from "../shared/DonutStatCard"
import { SummaryChart } from "./SummaryChart"
import { TicketSalesTable } from "./TicketSalesTable"
import styles from "./summary.module.css"

type RevenueTab = "revenue" | "resale"
type Range = "24h" | "30d"

/** "Tổng kết" content: header, revenue tabs, overview donuts, chart + detail. */
export function EventSummaryView({ event }: { event: OrganizerEvent }) {
  const [tab, setTab] = useState<RevenueTab>("revenue")
  const [range, setRange] = useState<Range>("30d")

  const summary = useMemo(() => summarizeEvent(event), [event])
  const series = useMemo(() => buildSummarySeries(event, range), [event, range])
  const types = event.ticketTypes ?? []

  return (
    <>
      <EventShowHeader dateText={event.dateTime} />

      <h2 className={styles.pageHeading}>Doanh thu</h2>

      <div className={styles.tabs} role="tablist" aria-label="Loại doanh thu">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "revenue"}
          className={cn(styles.tab, tab === "revenue" && styles.tabActive)}
          onClick={() => setTab("revenue")}
        >
          Doanh thu
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "resale"}
          className={cn(styles.tab, tab === "resale" && styles.tabActive)}
          onClick={() => setTab("resale")}
        >
          Doanh số bán lại vé
        </button>
      </div>

      {tab === "resale" ? (
        <div className={styles.resaleEmpty}>Chưa có dữ liệu bán lại vé.</div>
      ) : (
        <>
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

          <SummaryChart data={series} />

          <h3 className={styles.sectionLabel}>Chi tiết</h3>
          <p className={styles.subLabel}>Vé đã bán</p>
          <TicketSalesTable types={types} />
        </>
      )}
    </>
  )
}
