"use client"

import { CalendarDays, RefreshCw, ChevronDown } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { useWorkspaceEvent } from "../EventWorkspaceContext"
import type { ServerEventShow } from "../organizer-event-detail-api"
import styles from "./shared.module.css"

/** Dropdown/display label for one show: its title or an auto-numbered fallback. */
function showLabel(show: ServerEventShow, index: number): string {
  const name = show.title?.trim() || `Suất ${index + 1}`
  return show.startTime ? `${name} — ${formatDateTime(show.startTime)}` : name
}

/**
 * Shared header for the report sub-pages (Tổng kết / Check-in / Đơn hàng /
 * Phân tích / Sơ đồ ghế): the active suất diễn's date plus the "Đổi suất
 * diễn" switcher. The selection lives in the workspace context, so it
 * follows the organizer across tabs. Events with a single show (or legacy
 * flat events) just see their date — nothing to switch.
 */
export function EventShowHeader() {
  const { event, shows, selectedShowId, setSelectedShowId } = useWorkspaceEvent()

  const selectedIndex = shows.findIndex((s) => s._id === selectedShowId)
  const selected = selectedIndex >= 0 ? shows[selectedIndex] : undefined
  const dateText = selected?.startTime ? formatDateTime(selected.startTime) : event.dateTime

  return (
    <div className={styles.headerRow}>
      <span className={styles.dateChip}>
        <CalendarDays size={18} aria-hidden="true" />
        {dateText}
        {selected && (
          <span className={styles.showBadge}>
            {selected.title?.trim() || `Suất ${selectedIndex + 1}`}
          </span>
        )}
      </span>

      {shows.length > 1 && (
        <label className={styles.changeShowWrap}>
          <span className={styles.changeShowLabel}>
            <RefreshCw size={15} aria-hidden="true" />
            Đổi suất diễn
          </span>
          <select
            className={styles.changeShowSelect}
            value={selectedShowId ?? "all"}
            onChange={(e) =>
              setSelectedShowId(e.target.value === "all" ? null : e.target.value)
            }
            aria-label="Chọn suất diễn"
          >
            <option value="all">Tất cả suất diễn</option>
            {shows.map((s, i) => (
              <option key={s._id} value={s._id}>
                {showLabel(s, i)}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden="true" className={styles.changeShowChevron} />
        </label>
      )}
    </div>
  )
}
