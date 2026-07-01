import { CalendarDays, RefreshCw } from "lucide-react"
import styles from "./shared.module.css"

/** Shared "show date + change-show" header used by report sub-pages. */
export function EventShowHeader({ dateText }: { dateText: string }) {
  return (
    <div className={styles.headerRow}>
      <span className={styles.dateChip}>
        <CalendarDays size={18} aria-hidden="true" />
        {dateText}
      </span>
      <button type="button" className={styles.changeShowBtn}>
        Đổi suất diễn
        <RefreshCw size={15} aria-hidden="true" />
      </button>
    </div>
  )
}
