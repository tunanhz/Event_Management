import styles from "./shared.module.css"

interface DonutStatCardProps {
  label: string
  value: string
  caption: string
  percent: number
}

const RADIUS = 46
const CIRC = 2 * Math.PI * RADIUS

/** Card with a value, caption and an amber donut percentage ring. */
export function DonutStatCard({
  label,
  value,
  caption,
  percent,
}: DonutStatCardProps) {
  const offset = CIRC * (1 - Math.min(100, Math.max(0, percent)) / 100)

  return (
    <div className={styles.statCard}>
      <div className={styles.statInfo}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
        <span className={styles.statCaption}>{caption}</span>
      </div>

      <div className={styles.donut}>
        <svg className={styles.donutSvg} viewBox="0 0 108 108">
          <circle
            cx="54"
            cy="54"
            r={RADIUS}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="9"
            opacity={0.9}
          />
          <circle
            cx="54"
            cy="54"
            r={RADIUS}
            fill="none"
            stroke="#fcd34d"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={styles.donutPct}>{percent} %</span>
      </div>
    </div>
  )
}
