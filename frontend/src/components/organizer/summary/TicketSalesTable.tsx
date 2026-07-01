import { formatVnd, formatInt, type TicketType } from "../my-events-data"
import styles from "./summary.module.css"

/** "Vé đã bán" detail table: one row per ticket type with a sale-rate bar. */
export function TicketSalesTable({ types }: { types: TicketType[] }) {
  if (types.length === 0) {
    return <p className={styles.resaleEmpty}>Chưa có loại vé nào.</p>
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Loại vé</th>
            <th scope="col">Giá bán</th>
            <th scope="col">Đã bán</th>
            <th scope="col">Bị khoá</th>
            <th scope="col">Tỉ lệ bán</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t) => {
            const pct = t.total ? Math.round((t.sold / t.total) * 100) : 0
            return (
              <tr key={t.name}>
                <td className={styles.ticketName}>{t.name}</td>
                <td>{formatVnd(t.price)}</td>
                <td>
                  {formatInt(t.sold)} / {formatInt(t.total)}
                </td>
                <td>{formatInt(t.locked)}</td>
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
