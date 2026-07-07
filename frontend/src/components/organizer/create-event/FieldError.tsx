import { AlertCircle } from "lucide-react"
import styles from "./create-event-form.module.css"

/**
 * Inline validation message shown directly beneath a form field. Renders nothing
 * when there is no error; `id` links it to its input via aria-describedby.
 */
export function FieldError({ id, msg }: { id?: string; msg?: string }) {
  if (!msg) return null
  return (
    <p id={id} role="alert" className={styles.fieldError}>
      <AlertCircle size={14} aria-hidden="true" />
      {msg}
    </p>
  )
}
