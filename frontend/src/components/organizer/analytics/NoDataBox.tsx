import { Inbox } from "lucide-react"
import styles from "./analytics.module.css"

/** Reusable empty "No data" panel used by the channel box and source table. */
export function NoDataBox() {
  return (
    <div className={styles.noDataBox}>
      <Inbox size={40} className={styles.noDataIcon} aria-hidden="true" />
      <span className={styles.noDataText}>No data</span>
    </div>
  )
}
