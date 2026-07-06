import type { LucideIcon } from "lucide-react"
import styles from "./event-manage.module.css"

/** Reusable empty state for management sections without data yet. */
export function ManageSectionEmpty({
  Icon,
  title,
  text,
}: {
  Icon: LucideIcon
  title: string
  text: string
}) {
  return (
    <div className={styles.empty}>
      <Icon size={56} className={styles.emptyIcon} aria-hidden="true" />
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{text}</p>
    </div>
  )
}
