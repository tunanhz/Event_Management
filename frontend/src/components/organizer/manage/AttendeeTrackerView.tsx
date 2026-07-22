"use client"

import { useMemo, useState } from "react"
import { Download, Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { ManageSectionEmpty } from "./ManageSectionEmpty"
import {
  ATTENDEE_STATUS_LABELS,
  attendeesToCsv,
  summarizeAttendees,
  type AttendeeStatus,
  type EventAttendee,
} from "./attendee-tracker-data"
import tableStyles from "../checkin/checkin.module.css"
import styles from "./attendee-tracker.module.css"

const FILTERS: { id: AttendeeStatus | "all"; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "checked_in", label: "Đã check-in" },
  { id: "registered", label: "Chưa vào" },
  { id: "cancelled", label: "Đã hủy" },
]

const STATUS_CLASS: Record<AttendeeStatus, string> = {
  checked_in: styles.statusCheckedIn,
  registered: styles.statusRegistered,
  cancelled: styles.statusCancelled,
}

interface AttendeeTrackerViewProps {
  eventId: string
  eventTitle: string
  attendees: EventAttendee[]
}

function formatDateSafe(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/**
 * "Attendee Tracker" — participant matrix for one event: search, check-in
 * status filter and CSV export.
 */
export function AttendeeTrackerView({ eventId, eventTitle, attendees }: AttendeeTrackerViewProps) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<AttendeeStatus | "all">("all")

  const stats = summarizeAttendees(attendees)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return attendees.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false
      if (!q) return true
      return [a.name, a.email, a.orderCode, a.ticketType].some((v) => v.toLowerCase().includes(q))
    })
  }, [attendees, query, filter])

  const exportCsv = () => {
    const blob = new Blob([attendeesToCsv(rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `danh-sach-tham-du-${eventId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (attendees.length === 0) {
    return (
      <ManageSectionEmpty
        Icon={Users}
        title="Chưa có người tham dự"
        text="Danh sách người mua vé sẽ hiển thị ở đây ngay khi có đơn hàng đầu tiên."
      />
    )
  }

  return (
    <div suppressHydrationWarning>
      <h1 className={tableStyles.pageHeading}>Người tham dự</h1>

      {/* Summary chips */}
      <div className={styles.summaryRow}>
        <span className={styles.summaryChip}>
          Đơn hàng: <span className={styles.summaryValue}>{stats.total}</span>
        </span>
        <span className={styles.summaryChip}>
          Vé hợp lệ: <span className={styles.summaryValue}>{stats.tickets}</span>
        </span>
        <span className={styles.summaryChip}>
          Đã check-in: <span className={styles.summaryValue}>{stats.checkedIn}</span>
        </span>
        <span className={styles.summaryChip}>
          Đã hủy: <span className={styles.summaryValue}>{stats.cancelled}</span>
        </span>
      </div>

      {/* Toolbar: search + filter + export */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Tìm theo tên, email, mã đơn…"
            aria-label="Tìm người tham dự"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup} role="tablist" aria-label="Lọc theo trạng thái">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={cn(styles.filterBtn, filter === f.id && styles.filterBtnActive)}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.exportBtn} onClick={exportCsv}>
          <Download size={16} aria-hidden="true" />
          Xuất CSV
        </button>
      </div>

      {/* Attendee matrix */}
      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} aria-label={`Người tham dự — ${eventTitle}`}>
          <thead>
            <tr>
              <th scope="col">Người mua</th>
              <th scope="col">Mã đơn</th>
              <th scope="col">Loại vé</th>
              <th scope="col">Số vé</th>
              <th scope="col">Ngày mua</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  Không có người tham dự khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id}>
                  <td className={styles.nameCell}>
                    <div className={styles.nameMain}>{a.name}</div>
                    <div className={styles.nameSub}>{a.email}</div>
                  </td>
                  <td>{a.orderCode}</td>
                  <td>{a.ticketType}</td>
                  <td>{a.quantity}</td>
                  <td>{formatDateSafe(a.purchasedAt)}</td>
                  <td>
                    <span className={cn(styles.status, STATUS_CLASS[a.status])}>
                      {ATTENDEE_STATUS_LABELS[a.status]}
                      {a.checkedInAt ? ` · ${a.checkedInAt}` : ""}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
