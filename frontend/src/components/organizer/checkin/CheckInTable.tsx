import { Ticket } from "lucide-react"
import { formatVnd, formatInt } from "../my-events-data"
import type { CheckInByTicket } from "./organizer-checkin-api"
import styles from "./checkin.module.css"

/** Check-in detail table: real check-in count + rate per ticket type. */
export function CheckInTable({ byTicket }: { byTicket: CheckInByTicket[] }) {
  if (byTicket.length === 0) {
    return (
      <div className={styles.emptyBox}>
        <Ticket size={32} aria-hidden="true" className={styles.emptyIcon} />
        <p className={styles.emptyText}>Chưa có vé nào được bán cho sự kiện này.</p>
      </div>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Loại vé</th>
            <th scope="col">Giá bán</th>
            <th scope="col">Đã check-in</th>
            <th scope="col">Tỉ lệ check-in</th>
          </tr>
        </thead>
        <tbody>
          {byTicket.map((t) => {
            const pct = t.sold ? Math.round((t.checkedIn / t.sold) * 100) : 0
            return (
              <tr key={t.ticketName}>
                <td className={styles.ticketName}>{t.ticketName}</td>
                <td>{formatVnd(t.price)}</td>
                <td>
                  {formatInt(t.checkedIn)} / {formatInt(t.sold)}
                </td>
                <td>
                  <div className={styles.progressCell}>
                    <span className={styles.progressBar}>
                      <span
                        className={styles.progressFill}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className={styles.pctText}>{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
