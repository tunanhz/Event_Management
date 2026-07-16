"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { X, Inbox } from "lucide-react"
import { TICKET_LIMITS, createEmptyTicket, type TicketType } from "./create-event-data"
import formStyles from "./create-event-form.module.css"
import styles from "./ticket-type-modal.module.css"

interface TicketTypeModalProps {
  /** Ticket to edit, or null to create a fresh one. */
  ticket: TicketType | null
  /** End time of the show this tier sells into (datetime-local string) —
   *  ticket sales can't outlive their suất diễn. */
  showEndTime: string
  onClose: () => void
  onSave: (ticket: TicketType) => void
}

type Errors = Partial<Record<keyof TicketType, string>>

/**
 * Create / edit modal for a ticket tier. Mirrors the reference fields (name,
 * price/free, quantity, per-order limits, sale window, description, artwork)
 * and validates the numeric + date constraints on submit.
 */
export function TicketTypeModal({ ticket, showEndTime, onClose, onSave }: TicketTypeModalProps) {
  const [draft, setDraft] = useState<TicketType>(() => ticket ?? createEmptyTicket())
  const [errors, setErrors] = useState<Errors>({})
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const set = <K extends keyof TicketType>(key: K, value: TicketType[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0))

  const validate = (): Errors => {
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Vui lòng nhập tên vé"
    if (!draft.isFree && draft.price <= 0) e.price = "Giá vé phải lớn hơn 0"
    if (draft.quantity < 1) e.quantity = "Tối thiểu 1 vé"
    if (draft.minPerOrder < 1) e.minPerOrder = "Tối thiểu 1"
    if (draft.maxPerOrder < draft.minPerOrder) e.maxPerOrder = "Phải ≥ số vé tối thiểu"
    if (draft.maxPerOrder > draft.quantity) e.maxPerOrder = "Không vượt quá tổng số vé"
    if (!draft.saleStart) e.saleStart = "Chọn thời gian bắt đầu"
    else if (new Date(draft.saleStart).getTime() <= Date.now())
      e.saleStart = "Thời gian bắt đầu bán vé phải ở tương lai"
    if (!draft.saleEnd) e.saleEnd = "Chọn thời gian kết thúc"
    if (draft.saleStart && draft.saleEnd && draft.saleEnd <= draft.saleStart)
      e.saleEnd = "Phải sau thời gian bắt đầu bán"
    if (!e.saleEnd && draft.saleEnd && showEndTime && draft.saleEnd > showEndTime)
      e.saleEnd = "Không được sau thời gian kết thúc suất diễn"
    return e
  }

  const handleSave = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length === 0) {
      onSave({ ...draft, name: draft.name.trim(), price: draft.isFree ? 0 : draft.price })
    }
  }

  const pickImage = (file: File | undefined) => {
    if (!file) return
    if (draft.image) URL.revokeObjectURL(draft.image)
    set("image", URL.createObjectURL(file))
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="ticket-modal-title" className={styles.title}>
            {ticket ? "Chỉnh sửa loại vé" : "Tạo loại vé mới"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
            <X size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Name */}
          <Field label="Tên vé" required error={errors.name}>
            <div className={formStyles.inputWrap}>
              <input
                ref={nameRef}
                className={formStyles.input}
                type="text"
                maxLength={TICKET_LIMITS.name}
                placeholder="Tên vé"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <span className={formStyles.counter}>
                {draft.name.length} / {TICKET_LIMITS.name}
              </span>
            </div>
          </Field>

          {/* Price / quantity / per-order limits */}
          <div className={styles.grid4}>
            <Field label="Giá vé" required error={errors.price}>
              <div className={styles.priceRow}>
                <input
                  className={`${formStyles.input} ${styles.priceInput}`}
                  type="number"
                  min={0}
                  step={1000}
                  style={{ paddingRight: "1rem" }}
                  value={draft.isFree ? 0 : draft.price}
                  disabled={draft.isFree}
                  onChange={(e) => set("price", num(e.target.value))}
                />
                <label className={styles.freeToggle}>
                  <input
                    type="checkbox"
                    checked={draft.isFree}
                    onChange={(e) => set("isFree", e.target.checked)}
                  />
                  Miễn phí
                </label>
              </div>
            </Field>

            <NumField label="Tổng số lượng vé" value={draft.quantity} error={errors.quantity} onChange={(v) => set("quantity", v)} />
            <NumField label="Số vé tối thiểu trong một đơn hàng" value={draft.minPerOrder} error={errors.minPerOrder} onChange={(v) => set("minPerOrder", v)} />
            <NumField label="Số vé tối đa trong một đơn hàng" value={draft.maxPerOrder} error={errors.maxPerOrder} onChange={(v) => set("maxPerOrder", v)} />
          </div>

          {/* Sale window */}
          <div className={styles.grid2}>
            <Field label="Thời gian bắt đầu bán vé" required error={errors.saleStart}>
              <input
                className={`${formStyles.input} ${styles.dateInput}`}
                type="datetime-local"
                style={{ padding: "0 1rem" }}
                value={draft.saleStart}
                onChange={(e) => set("saleStart", e.target.value)}
              />
            </Field>
            <Field label="Thời gian kết thúc bán vé" required error={errors.saleEnd}>
              <input
                className={`${formStyles.input} ${styles.dateInput}`}
                type="datetime-local"
                style={{ padding: "0 1rem" }}
                value={draft.saleEnd}
                max={showEndTime || undefined}
                onChange={(e) => set("saleEnd", e.target.value)}
              />
            </Field>
          </div>

          {/* Description + artwork */}
          <div className={styles.grid2}>
            <Field label="Thông tin vé">
              <textarea
                className={formStyles.textarea}
                maxLength={TICKET_LIMITS.description}
                placeholder="Description"
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
              <div className={formStyles.counterBlock}>
                {draft.description.length} / {TICKET_LIMITS.description}
              </div>
            </Field>

            <Field label="Hình ảnh vé">
              <div className={styles.imageField}>
                <label className={styles.dropzone} tabIndex={0}>
                  {draft.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.image} alt="Xem trước ảnh vé" className={styles.preview} />
                      <button
                        type="button"
                        className={styles.removeImg}
                        aria-label="Xóa ảnh vé"
                        onClick={(e) => {
                          e.preventDefault()
                          if (draft.image) URL.revokeObjectURL(draft.image)
                          set("image", null)
                        }}
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={styles.dropIcon}><Inbox size={30} aria-hidden="true" /></span>
                      <span className={styles.dropText}>Thêm</span>
                      <span className={styles.dropHint}>1MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.hidden}
                    onChange={(e) => pickImage(e.target.files?.[0])}
                  />
                </label>
              </div>
            </Field>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.saveBtn} onClick={handleSave}>
            Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

/** Label + required marker + inline error wrapper. */
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className={formStyles.field} style={{ marginBottom: 0 }}>
      <label className={formStyles.label}>
        {required && <span className={formStyles.required} aria-hidden="true">*</span>}
        {label}
      </label>
      {children}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}

/** Numeric field used for quantity / per-order limits. */
function NumField({
  label,
  value,
  error,
  onChange,
}: {
  label: string
  value: number
  error?: string
  onChange: (v: number) => void
}) {
  return (
    <Field label={label} required error={error}>
      <input
        className={formStyles.input}
        type="number"
        min={1}
        style={{ paddingRight: "1rem" }}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0))}
      />
    </Field>
  )
}
