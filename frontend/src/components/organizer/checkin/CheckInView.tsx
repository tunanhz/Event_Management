import { Users, UserMinus } from "lucide-react"
import {
  summarizeEvent,
  formatInt,
  type OrganizerEvent,
} from "../my-events-data"
import { EventShowHeader } from "../shared/EventShowHeader"
import { DonutStatCard } from "../shared/DonutStatCard"
import { CheckInTable } from "./CheckInTable"
import styles from "./checkin.module.css"

/** Check-in report: checked-in overview + live counters + per-type detail.
 *  No attendee check-in feed is wired yet, so counters read zero. */
export function CheckInView({ event }: { event: OrganizerEvent }) {
  const { soldTickets } = summarizeEvent(event)
  const checkedIn = 0
  const inside = 0
  const left = 0
  const percent = soldTickets ? Math.round((checkedIn / soldTickets) * 100) : 0
  const types = event.ticketTypes ?? []

  return (
    <>
      <EventShowHeader dateText={event.dateTime} />

      <h2 className={styles.pageHeading}>Check-in</h2>

      <h3 className={styles.sectionLabel}>Tổng quan</h3>
      <div className={styles.overviewGrid}>
        <DonutStatCard
          label="Đã check-in"
          value={`${formatInt(checkedIn)} vé`}
          caption={`Đã bán ${formatInt(soldTickets)} vé`}
          percent={percent}
        />

        <div className={styles.miniCol}>
          <div className={styles.miniCard}>
            <span className={`${styles.miniIcon} ${styles.miniIconBlue}`}>
              <Users size={20} aria-hidden="true" />
            </span>
            <span className={styles.miniLabel}>Trong sự kiện</span>
            <span className={styles.miniValue}>{formatInt(inside)}</span>
          </div>
          <div className={styles.miniCard}>
            <span className={`${styles.miniIcon} ${styles.miniIconRed}`}>
              <UserMinus size={20} aria-hidden="true" />
            </span>
            <span className={styles.miniLabel}>Đã ra ngoài</span>
            <span className={styles.miniValue}>{formatInt(left)}</span>
          </div>
        </div>
      </div>

      <h3 className={styles.sectionLabel}>Chi tiết</h3>
      <CheckInTable types={types} />
    </>
  )
}
