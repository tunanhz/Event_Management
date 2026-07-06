"use client"

import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import { AnalyticsStatCard } from "./AnalyticsStatCard"
import { VisitsChart, type VisitPoint } from "./VisitsChart"
import { NoDataBox } from "./NoDataBox"
import styles from "./analytics.module.css"

/** Build a zero-filled daily visit series between two yyyy-mm-dd dates.
 *  Constructed from local date parts so SSR and CSR produce identical labels. */
function buildVisitSeries(from: string, to: string): VisitPoint[] {
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
  while (cur <= end && guard < 400) {
    out.push({ label: `${cur.getDate()}/${cur.getMonth() + 1}`, visits: 0 })
    cur.setDate(cur.getDate() + 1)
    guard += 1
  }
  return out
}

const DISCLAIMER =
  "Các số liệu được hiển thị có thể không khớp với số liệu thực tế và chỉ mang tính chất tham khảo do giới hạn của các công cụ theo dõi web."

/** Analytics ("Phân tích") — marketing tools & report. No web-tracking data
 *  is wired yet, so metrics read zero and channel/source panels show No data. */
export function AnalyticsView() {
  const [from, setFrom] = useState("2026-05-31")
  const [to, setTo] = useState("2026-06-30")
  const [applied, setApplied] = useState({ from: "2026-05-31", to: "2026-06-30" })

  const series = useMemo(
    () => buildVisitSeries(applied.from, applied.to),
    [applied]
  )

  // No traffic source connected yet → all metrics zero.
  const visits = 0
  const users = 0
  const buyers = 0
  const conversion = visits > 0 ? `${Math.round((buyers / visits) * 100)} %` : "0 %"

  return (
    <>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>Công cụ &amp; Báo cáo Marketing</h2>
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

      {/* Metric cards */}
      <div className={styles.statsCard}>
        <AnalyticsStatCard label="Số lượt truy cập" value={String(visits)} />
        <AnalyticsStatCard label="Người dùng" value={String(users)} />
        <AnalyticsStatCard label="Người mua" value={String(buyers)} />
        <AnalyticsStatCard label="Tỉ lệ chuyển đổi" value={conversion} />
      </div>

      {/* Chart + channel */}
      <div className={styles.grid2}>
        <div className={styles.panel}>
          <div className={styles.panelTitleRow}>
            <h3 className={styles.panelTitle}>Lượt truy cập theo thời gian</h3>
          </div>
          <VisitsChart data={series} />
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitleRow}>
            <h3 className={styles.panelTitle}>Số lượt truy cập theo kênh</h3>
            <Info size={16} className={styles.infoIcon} aria-hidden="true" />
          </div>
          <p className={styles.note}>{DISCLAIMER}</p>
          <NoDataBox />
        </div>
      </div>

      {/* Traffic source table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Nguồn truy cập</th>
              <th scope="col">Tổng lượt truy cập</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.emptyCell} colSpan={2}>
                <NoDataBox />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
