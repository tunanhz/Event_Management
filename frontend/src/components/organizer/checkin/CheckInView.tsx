"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, AlertTriangle, RefreshCw, Ticket, Users, Tags } from "lucide-react"
import { formatInt, type OrganizerEvent } from "../my-events-data"
import { useWorkspaceEvent } from "../EventWorkspaceContext"
import { EventShowHeader } from "../shared/EventShowHeader"
import { DonutStatCard } from "../shared/DonutStatCard"
import { CheckInTable } from "./CheckInTable"
import { CheckInAttendeeList } from "./CheckInAttendeeList"
import { fetchCheckInReport, type CheckInReport } from "./organizer-checkin-api"
import { fetchEventAttendees } from "../manage/organizer-attendees-api"
import type { EventAttendee } from "../manage/attendee-tracker-data"
import styles from "./checkin.module.css"

const centered: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "var(--muted-foreground)",
  padding: "0.75rem 0",
}

/**
 * Check-in report — real attendance from GET /checkins: the "Đã check-in"
 * figure (entry-only — no exit/checkout tracking; once someone leaves they
 * simply aren't re-scanned) plus a per-ticket-type breakdown. The header's
 * "Đổi suất diễn" switcher scopes everything to one show.
 */
export function CheckInView({ event }: { event: OrganizerEvent }) {
  const { selectedShowId } = useWorkspaceEvent()
  const [report, setReport] = useState<CheckInReport | null>(null)
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = (silent: boolean) => {
    if (silent) setRefreshing(true)
    return Promise.all([
      fetchCheckInReport(event.id, selectedShowId),
      fetchEventAttendees(event.id, selectedShowId),
    ])
      .then(([r, a]) => {
        if (mountedRef.current) {
          setReport(r)
          setAttendees(a)
          setError(null)
        }
      })
      .catch((e) => {
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : "Không tải được dữ liệu check-in")
        }
      })
      .finally(() => {
        if (mountedRef.current && silent) setRefreshing(false)
      })
  }

  useEffect(() => {
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, selectedShowId])

  if (error) {
    return (
      <div style={{ ...centered, color: "#ef4444" }} role="alert">
        <AlertTriangle size={18} aria-hidden="true" /> {error}
      </div>
    )
  }
  if (!report || !attendees) {
    return (
      <div style={centered} role="status" aria-live="polite">
        <Loader2 size={18} aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }} />
        Đang tải dữ liệu check-in…
      </div>
    )
  }

  const { stats, byTicket } = report
  const remaining = Math.max(0, stats.paidTickets - stats.checkedInTickets)

  return (
    <>
      <EventShowHeader />

      <div className={styles.headingRow}>
        <h2 className={styles.pageHeading}>Check-in</h2>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={15}
            aria-hidden="true"
            className={refreshing ? styles.spinning : undefined}
          />
          Làm mới
        </button>
      </div>

      <h3 className={styles.sectionLabel}>Tổng quan</h3>
      <div className={styles.overviewGrid}>
        <DonutStatCard
          label="Đã check-in"
          value={`${formatInt(stats.checkedInTickets)} vé`}
          caption={`Đã bán ${formatInt(stats.paidTickets)} vé`}
          percent={stats.rate}
        />
        <div className={styles.miniStats}>
          <div className={styles.miniCard}>
            <span className={styles.miniIcon}>
              <Ticket size={18} aria-hidden="true" />
            </span>
            <span className={styles.miniValue}>{formatInt(stats.paidTickets)}</span>
            <span className={styles.miniLabel}>Vé đã bán</span>
          </div>
          <div className={styles.miniCard}>
            <span className={styles.miniIcon}>
              <Users size={18} aria-hidden="true" />
            </span>
            <span className={styles.miniValue}>{formatInt(remaining)}</span>
            <span className={styles.miniLabel}>Chưa check-in</span>
          </div>
          <div className={styles.miniCard}>
            <span className={styles.miniIcon}>
              <Tags size={18} aria-hidden="true" />
            </span>
            <span className={styles.miniValue}>{formatInt(byTicket.length)}</span>
            <span className={styles.miniLabel}>Loại vé</span>
          </div>
        </div>
      </div>

      <h3 className={styles.sectionLabel}>Chi tiết theo loại vé</h3>
      <CheckInTable byTicket={byTicket} />

      <h3 className={styles.sectionLabel}>Danh sách check-in</h3>
      <CheckInAttendeeList attendees={attendees} />
    </>
  )
}
