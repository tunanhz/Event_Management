"use client"

import { useMemo, useState } from "react"
import { Search, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EventAttendee } from "../manage/attendee-tracker-data"
import tableStyles from "./checkin.module.css"
import attendeeStyles from "../manage/attendee-tracker.module.css"

type EntryFilter = "all" | "checked_in" | "registered"

const FILTERS: { id: EntryFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "checked_in", label: "Đã check-in" },
  { id: "registered", label: "Chưa vào" },
]

/**
 * Per-attendee check-in roster — real buyer contact info + entry status
 * (business.md §2.3, Organizer: "Xem danh sách chi tiết những người tham gia
 * đã đăng ký mua vé"). Cancelled/refunded orders are excluded up front: they
 * hold no valid ticket to check in. Read-only here — actual scanning happens
 * on the staff gate station.
 */
export function CheckInAttendeeList({ attendees }: { attendees: EventAttendee[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<EntryFilter>("all")

  const entrants = useMemo(() => attendees.filter((a) => a.status !== "cancelled"), [attendees])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entrants.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false
      if (!q) return true
      return [a.name, a.email, a.orderCode, a.ticketType].some((v) => v.toLowerCase().includes(q))
    })
  }, [entrants, query, filter])

  if (entrants.length === 0) {
    return (
      <div className={tableStyles.emptyBox}>
        <Users size={32} aria-hidden="true" className={tableStyles.emptyIcon} />
        <p className={tableStyles.emptyText}>Chưa có người tham dự nào cho sự kiện này.</p>
      </div>
    )
  }

  return (
    <div className={tableStyles.attendeeSection}>
      <div className={attendeeStyles.toolbar}>
        <div className={attendeeStyles.searchWrap}>
          <Search size={16} className={attendeeStyles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={attendeeStyles.searchInput}
            placeholder="Tìm theo tên, email, mã đơn…"
            aria-label="Tìm người tham dự"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className={attendeeStyles.filterGroup} role="tablist" aria-label="Lọc theo trạng thái check-in">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={cn(attendeeStyles.filterBtn, filter === f.id && attendeeStyles.filterBtnActive)}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={tableStyles.tableWrap}>
        <table className={tableStyles.table} aria-label="Danh sách check-in">
          <thead>
            <tr>
              <th scope="col">Người tham dự</th>
              <th scope="col">Loại vé</th>
              <th scope="col">Số vé</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className={attendeeStyles.emptyRow}>
                  Không có người tham dự khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((a) => (
                <tr key={a.id}>
                  <td className={attendeeStyles.nameCell}>
                    <div className={attendeeStyles.nameMain}>{a.name}</div>
                    <div className={attendeeStyles.nameSub}>{a.email}</div>
                  </td>
                  <td>{a.ticketType}</td>
                  <td>{a.quantity}</td>
                  <td>
                    <span
                      className={cn(
                        attendeeStyles.status,
                        a.status === "checked_in"
                          ? attendeeStyles.statusCheckedIn
                          : attendeeStyles.statusRegistered
                      )}
                    >
                      {a.status === "checked_in" ? "Đã check-in" : "Chưa vào"}
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
