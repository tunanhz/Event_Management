import { formatVnd, formatInt, type TicketType } from "../my-events-data"
import styles from "./checkin.module.css"

/** Check-in detail table: check-in count + rate per ticket type. */
export function CheckInTable({ types }: { types: TicketType[] }) {
  if (types.length === 0) {
    return null
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
          {types.map((t) => {
            // No attendee has checked in yet, so checked-in is 0 for every type.
            const checkedIn = 0
            const pct = t.sold ? Math.round((checkedIn / t.sold) * 100) : 0
            return (
              <tr key={t.name}>
                <td className={styles.ticketName}>{t.name}</td>
                <td>{formatVnd(t.price)}</td>
                <td>
                  {formatInt(checkedIn)} / {formatInt(t.sold)}
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
