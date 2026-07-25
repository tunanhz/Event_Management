"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { X, Inbox, CalendarClock } from "lucide-react"
import { TICKET_LIMITS, createEmptyTicket, saleEndCapFor, toLocalDateTime, type TicketType } from "./create-event-data"
import formStyles from "./create-event-form.module.css"
import styles from "./ticket-type-modal.module.css"

interface TicketTypeModalProps {
  /** Ticket to edit, or null to create a fresh one. */
  ticket: TicketType | null
  /** For create mode: a previously-dismissed draft to resume from, so an
   *  accidental close doesn't wipe what was already filled in. */
  initialDraft?: TicketType | null
  /** Start of the show this tier sells into (datetime-local string) — sales
   *  must close 30 minutes before it. */
  showStartTime: string
  /** End of that same show (datetime-local string). Display only — shown next
   *  to the start so the organizer can see the whole slot while picking the
   *  sale window, without leaving the modal. Never used for validation. */
  showEndTime: string
  /** Called on any dismissal with the current draft, so the parent can keep it. */
  onClose: (draft: TicketType) => void
  onSave: (ticket: TicketType) => void
}

type Errors = Partial<Record<keyof TicketType, string>>

/** `datetime-local` string → "HH:mm DD/MM/YYYY" for read-only display.
 *  Returns "—" for an empty/unparseable value (show not filled in yet). */
function formatShowTime(value: string): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

/**
 * Create / edit modal for a ticket tier. Mirrors the reference fields (name,
 * price/free, quantity, per-order limits, sale window, description, artwork)
 * and validates the numeric + date constraints on submit.
 */
export function TicketTypeModal({ ticket, initialDraft, showStartTime, showEndTime, onClose, onSave }: TicketTypeModalProps) {
  // Latest sale close allowed for this show: 30 minutes before it starts.
  const saleEndCap = saleEndCapFor(showStartTime)
  // New tickets pre-fill a valid, editable sale window: it opens ~1h from now
  // (must be in the future) and closes at that cap. An existing ticket /
  // resumed draft keeps its own values untouched.
  const [draft, setDraft] = useState<TicketType>(() => {
    if (ticket) return ticket
    if (initialDraft) return initialDraft
    return {
      ...createEmptyTicket(),
      saleStart: toLocalDateTime(new Date(Date.now() + 60 * 60 * 1000)),
      saleEnd: saleEndCap,
    }
  })
  // Errors recompute live from the draft; a field turns red once it's been
  // touched (changed) or after a failed "Lưu" — no need to submit first.
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [attempted, setAttempted] = useState(false)
  // Captured once at mount so the live (render-time) validation stays pure;
  // the save handler re-reads the clock for an up-to-date "future" check.
  const [nowTs] = useState(() => Date.now())
  const nameRef = useRef<HTMLInputElement>(null)
  // Keep the latest draft reachable from the keydown listener without
  // re-binding it on every keystroke.
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(draftRef.current)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const set = <K extends keyof TicketType>(key: K, value: TicketType[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setTouched((t) => (t.has(key) ? t : new Set(t).add(key)))
  }

  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0))

  const validate = (now: number): Errors => {
    const e: Errors = {}
    if (!draft.name.trim()) e.name = "Vui lòng nhập tên vé"
    if (!draft.isFree && draft.price <= 0) e.price = "Giá vé phải lớn hơn 0"
    if (draft.quantity < 1) e.quantity = "Tối thiểu 1 vé"
    if (draft.minPerOrder < 1) e.minPerOrder = "Tối thiểu 1"
    if (draft.maxPerOrder < draft.minPerOrder) e.maxPerOrder = "Phải ≥ số vé tối thiểu"
    if (draft.maxPerOrder > draft.quantity) e.maxPerOrder = "Không vượt quá tổng số vé"
    if (!draft.saleStart) e.saleStart = "Chọn thời gian bắt đầu"
    else if (new Date(draft.saleStart).getTime() <= now)
      e.saleStart = "Thời gian bắt đầu bán vé phải ở tương lai"
    if (!draft.saleEnd) e.saleEnd = "Chọn thời gian kết thúc"
    else if (draft.saleStart && draft.saleEnd <= draft.saleStart)
      e.saleEnd = "Phải sau thời gian bắt đầu bán"
    else if (saleEndCap && draft.saleEnd > saleEndCap)
      e.saleEnd = "Phải trước giờ bắt đầu suất diễn ít nhất 30 phút"
    return e
  }

  // Live errors + a per-field reveal gate (touched, or after a save attempt).
  const errors = validate(nowTs)
  const shownErr = (key: keyof TicketType) =>
    attempted || touched.has(key) ? errors[key] : undefined

  const handleSave = () => {
    setAttempted(true)
    // Re-validate against the current clock (event handler → fresh time is fine).
    if (Object.keys(validate(Date.now())).length === 0) {
      onSave({ ...draft, name: draft.name.trim(), price: draft.isFree ? 0 : draft.price })
    }
  }

  const pickImage = (file: File | undefined) => {
    if (!file) return
    if (draft.image) URL.revokeObjectURL(draft.image)
    set("image", URL.createObjectURL(file))
  }

  // Backdrop clicks do NOT dismiss — an accidental click outside must never
  // wipe what the organizer has typed. Close only via ✕, Escape or Lưu.
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 id="ticket-modal-title" className={styles.title}>
            {ticket ? "Chỉnh sửa loại vé" : "Tạo loại vé mới"}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={() => onClose(draft)} aria-label="Đóng">
            <X size={22} />
          </button>
        </div>

        <div className={styles.body}>
          {/* Name */}
          <Field label="Tên vé" required error={shownErr("name")}>
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
            <Field label="Giá vé" required error={shownErr("price")}>
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

            <NumField label="Tổng số lượng vé" value={draft.quantity} error={shownErr("quantity")} onChange={(v) => set("quantity", v)} />
            <NumField label="Số vé tối thiểu trong một đơn hàng" value={draft.minPerOrder} error={shownErr("minPerOrder")} onChange={(v) => set("minPerOrder", v)} />
            <NumField label="Số vé tối đa trong một đơn hàng" value={draft.maxPerOrder} error={shownErr("maxPerOrder")} onChange={(v) => set("maxPerOrder", v)} />
          </div>

          {/* Read-only reminder of the show this tier sells into, so the sale
              window can be set without leaving the modal to check the schedule. */}
          {(showStartTime || showEndTime) && (
            <div className={styles.showTimes}>
              <CalendarClock size={16} className={styles.showTimesIcon} aria-hidden="true" />
              <span className={styles.showTimesLabel}>Suất diễn:</span>
              <span
                className={styles.showTimesValue}
                aria-label={`Từ ${formatShowTime(showStartTime)} đến ${formatShowTime(showEndTime)}`}
              >
                {formatShowTime(showStartTime)}
                <span className={styles.showTimesArrow} aria-hidden="true">→</span>
                {formatShowTime(showEndTime)}
              </span>
            </div>
          )}

          {/* Sale window */}
          <div className={styles.grid2}>
            <Field label="Thời gian bắt đầu bán vé" required error={shownErr("saleStart")}>
              <input
                className={`${formStyles.input} ${styles.dateInput}`}
                type="datetime-local"
                style={{ padding: "0 1rem" }}
                value={draft.saleStart}
                onChange={(e) => set("saleStart", e.target.value)}
              />
            </Field>
            <Field label="Thời gian kết thúc bán vé" required error={shownErr("saleEnd")}>
              <input
                className={`${formStyles.input} ${styles.dateInput}`}
                type="datetime-local"
                style={{ padding: "0 1rem" }}
                value={draft.saleEnd}
                max={saleEndCap || undefined}
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
