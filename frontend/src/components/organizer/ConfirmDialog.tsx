"use client"

import { useEffect, useRef } from "react"
import { AlertTriangle } from "lucide-react"
import styles from "./ConfirmDialog.module.css"

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm button + warning icon, for destructive actions (delete, ...). */
  danger?: boolean
  /** Disables both buttons and swaps the confirm label to a busy state. */
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Reusable confirm/cancel modal — replaces native `window.confirm()` (which
 * cannot be styled and looks out of place next to the rest of the app).
 * Same overlay/modal shell as NoticeModal, adapted for a two-button prompt.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onCancel, loading])

  return (
    <div
      className={styles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      onClick={() => !loading && onCancel()}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {danger && (
          <span className={styles.dangerIcon} aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
        )}
        <h2 id="confirm-dialog-title" className={styles.title}>
          {title}
        </h2>
        <p id="confirm-dialog-message" className={styles.message}>
          {message}
        </p>
        <div className={styles.footer}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? styles.confirmBtnDanger : styles.confirmBtn}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
