"use client"

import { useEffect, useMemo, useState } from "react"
import { Info, Loader2, AlertTriangle } from "lucide-react"
import { formatVnd, formatInt } from "../my-events-data"
import { useWorkspaceEvent } from "../EventWorkspaceContext"
import { EventShowHeader } from "../shared/EventShowHeader"
import { AnalyticsStatCard } from "./AnalyticsStatCard"
import { VisitsChart, type VisitPoint } from "./VisitsChart"
import { NoDataBox } from "./NoDataBox"
import {
  fetchEventAnalytics,
  type EventAnalytics,
} from "./organizer-analytics-api"
import styles from "./analytics.module.css"

/** Zero-filled daily series between two yyyy-mm-dd dates, then overlaid with
 *  the event's real tickets-per-day figures. Local date parts only so SSR and
 *  CSR render identical labels. */
function buildDailySeries(
  from: string,
  to: string,
  byDay: Map<string, number>
): VisitPoint[] {
  const parse = (s: string) => {
    const [y, m, d] = s.split("-").map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }
  const start = parse(from)
  const end = parse(to)
  const out: VisitPoint[] = []
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out

  const cur = new Date(start)
  let guard = 0
  const pad = (n: number) => String(n).padStart(2, "0")
  while (cur <= end && guard < 400) {
    const key = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`
    out.push({ label: `${cur.getDate()}/${cur.getMonth() + 1}`, visits: byDay.get(key) ?? 0 })
    cur.setDate(cur.getDate() + 1)
    guard += 1
  }
  return out
}

const DISCLAIMER =
  "Số liệu truy cập web chưa được theo dõi (chưa tích hợp công cụ tracking); các số liệu bán vé bên dưới là dữ liệu thật từ hệ thống."

/** Analytics ("Phân tích") — real sales statistics from GET /analytics:
 *  revenue / tickets / orders cards, tickets-per-day chart and a per-ticket
 *  revenue table, scoped per suất diễn via the shared "Đổi suất diễn"
 *  switcher. Traffic panels stay "No data" until web tracking exists. */
export function AnalyticsView({ eventId }: { eventId: string }) {
  const { selectedShowId } = useWorkspaceEvent()
  const [data, setData] = useState<EventAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [applied, setApplied] = useState({ from: "", to: "" })

  useEffect(() => {
    let active = true
    fetchEventAnalytics(eventId, selectedShowId)
      .then((a) => {
        if (!active) return
        setData(a)
        // Default range: the event's actual sales window (or the last 30 days
        // when nothing has been sold yet).
        const first = a.revenueByDay[0]?.date
        const last = a.revenueByDay[a.revenueByDay.length - 1]?.date
        const pad = (n: number) => String(n).padStart(2, "0")
        const today = new Date()
        const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
        const fallbackTo = toStr(today)
        const fallbackFromDate = new Date(today)
        fallbackFromDate.setDate(fallbackFromDate.getDate() - 29)
        const fallbackFrom = toStr(fallbackFromDate)
        const range = { from: first ?? fallbackFrom, to: last ?? fallbackTo }
        setFrom(range.from)
        setTo(range.to)
        setApplied(range)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Không tải được thống kê")
      })
    return () => {
      active = false
    }
  }, [eventId, selectedShowId])

  const series = useMemo(() => {
    if (!data || !applied.from || !applied.to) return []
    const byDay = new Map(data.revenueByDay.map((d) => [d.date, d.tickets]))
    return buildDailySeries(applied.from, applied.to, byDay)
  }, [data, applied])

  if (error) {
    return (
      <div role="alert" style={{ color: "#ef4444", padding: "1rem 0" }}>
        <AlertTriangle size={18} aria-hidden="true" style={{ verticalAlign: "middle" }} /> {error}
      </div>
    )
  }
  if (!data) {
    return (
      <p role="status" style={{ color: "var(--muted-foreground)", padding: "1rem 0" }}>
        <Loader2
          size={18}
          aria-hidden="true"
          style={{ animation: "spin 0.8s linear infinite", verticalAlign: "middle" }}
        />{" "}
        Đang tải thống kê bán vé…
      </p>
    )
  }

  return (
    <>
      <EventShowHeader />

      <div className={styles.headerRow}>
        <h2 className={styles.heading}>Thống kê bán vé &amp; Doanh thu</h2>
        <div className={styles.dateControls}>
          <div className={styles.dateRange}>
            <input
              type="date"
              className={styles.dateInput}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Từ ngày"
            />
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
            <input
              type="date"
              className={styles.dateInput}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Đến ngày"
            />
          </div>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={() => setApplied({ from, to })}
          >
            Xác nhận
          </button>
        </div>
      </div>

      {/* Metric cards — real PAID-registration figures */}
      <div className={styles.statsCard}>
        <AnalyticsStatCard label="Doanh thu" value={formatVnd(data.totalRevenue)} />
        <AnalyticsStatCard label="Vé đã bán" value={formatInt(data.soldTickets)} />
        <AnalyticsStatCard label="Đơn đã thanh toán" value={formatInt(data.paidOrders)} />
        <AnalyticsStatCard
          label="Đơn hủy / hết hạn"
          value={formatInt(data.cancelledOrders)}
        />
      </div>

      {/* Chart */}
      <div className={styles.panel} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.panelTitleRow}>
          <h3 className={styles.panelTitle}>Vé bán ra theo thời gian</h3>
        </div>
        <VisitsChart data={series} seriesName="Vé bán ra" />
      </div>

      {/* Revenue per ticket type — real data */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Loại vé</th>
              <th scope="col">Giá bán</th>
              <th scope="col">Đã bán / Tổng</th>
              <th scope="col">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {data.salesByTicket.length === 0 ? (
              <tr>
                <td className={styles.emptyCell} colSpan={4}>
                  <NoDataBox />
                </td>
              </tr>
            ) : (
              data.salesByTicket.map((t) => (
                <tr key={t.ticketId}>
                  <td>{t.ticketName}</td>
                  <td>{formatVnd(t.price)}</td>
                  <td>
                    {formatInt(t.sold)} / {formatInt(t.quantity)}
                  </td>
                  <td>{formatVnd(t.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
