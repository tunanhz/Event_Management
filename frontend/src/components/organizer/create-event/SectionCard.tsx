import type { ReactNode } from "react"
import styles from "./create-event-form.module.css"

interface SectionCardProps {
  title?: string
  required?: boolean
  /** Optional inline action rendered on the right of the header (e.g. a link). */
  action?: { label: string; onClick?: () => void }
  children: ReactNode
}

/** Rounded panel that groups a labelled section of the create-event form. */
export function SectionCard({ title, required, action, children }: SectionCardProps) {
  return (
    <section className={styles.sectionCard}>
      {title && (
        <div className={styles.sectionHead}>
          <h3 className={styles.sectionTitle}>
            {required && <span className={styles.required} aria-hidden="true">*</span>}
            {title}
          </h3>
          {action && (
            <button type="button" className={styles.sectionAction} onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
