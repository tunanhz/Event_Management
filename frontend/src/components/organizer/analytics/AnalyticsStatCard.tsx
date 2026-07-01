import { Info } from "lucide-react"
import styles from "./analytics.module.css"

/** One metric cell inside the analytics stats card. */
export function AnalyticsStatCard({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className={styles.statCell}>
      <div className={styles.statHead}>
        <span className={styles.statLabel}>{label}</span>
        <Info size={15} className={styles.infoIcon} aria-hidden="true" />
      </div>
      <div className={styles.statValue}>{value}</div>
    </div>
  )
}
