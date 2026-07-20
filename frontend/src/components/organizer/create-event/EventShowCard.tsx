"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, X, GripVertical, Ticket, Pencil, Trash2, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EventShow, TicketType } from "./create-event-data"
import { FieldError } from "./FieldError"
import type { ShowFieldKey } from "./wizard-validation"
import formStyles from "./create-event-form.module.css"
import styles from "./time-and-tickets.module.css"

interface EventShowCardProps {
  show: EventShow
  /** 1-based position, used for the "Suất N" fallback when no title is set. */
  index: number
  /** Whether the delete-show control is shown (hidden for the only show). */
  canDelete: boolean
  /** Inline validation messages for this show (already filtered by touched). */
  errors?: Partial<Record<ShowFieldKey, string>>
  /** Marks a field as touched so its error can surface without a save press. */
  onFieldBlur?: (key: ShowFieldKey) => void
  onUpdate: (patch: Partial<EventShow>) => void
  onDelete: () => void
  onAddTicket: () => void
  onEditTicket: (ticket: TicketType) => void
  onDeleteTicket: (ticketId: string) => void
  onReorderTickets: (tickets: TicketType[]) => void
}

/**
 * One show (suất diễn): a collapsible card with an optional label, its own
 * start/end date range and its list of ticket tiers. Rows support
 * drag-to-reorder via native DnD.
 */
export function EventShowCard({
  show,
  index,
  canDelete,
  errors,
  onFieldBlur,
  onUpdate,
  onDelete,
  onAddTicket,
  onEditTicket,
  onDeleteTicket,
  onReorderTickets,
}: EventShowCardProps) {
  const [open, setOpen] = useState(true)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const drop = (target: number) => {
    if (dragIndex === null || dragIndex === target) return
    const next = [...show.tickets]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(target, 0, moved)
    onReorderTickets(next)
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <div className={styles.showCard}>
      <div className={styles.showHead}>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Thu gọn" : "Mở rộng"}
        >
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        <input
          type="text"
          className={styles.showTitleInput}
          value={show.title}
          maxLength={100}
          placeholder={`Suất ${index}`}
          aria-label="Tên suất diễn"
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        {canDelete && (
          <button type="button" className={styles.deleteShowBtn} onClick={onDelete} aria-label="Xóa suất diễn">
            <X size={20} />
          </button>
        )}
      </div>

      {open && (
        <>
          <div className={styles.dateGrid}>
            <div className={formStyles.field} style={{ marginBottom: 0 }}>
              <label className={formStyles.label}>Thời gian bắt đầu</label>
              <input
                className={cn(styles.dateInput, errors?.startTime && formStyles.inputError)}
                type="datetime-local"
                value={show.startTime}
                aria-invalid={!!errors?.startTime || undefined}
                onChange={(e) => {
                  onUpdate({ startTime: e.target.value })
                  onFieldBlur?.("startTime")
                }}
                onBlur={() => onFieldBlur?.("startTime")}
                aria-label="Thời gian bắt đầu"
              />
              <FieldError msg={errors?.startTime} />
            </div>
            <div className={formStyles.field} style={{ marginBottom: 0 }}>
              <label className={formStyles.label}>Thời gian kết thúc</label>
              <input
                className={cn(styles.dateInput, errors?.endTime && formStyles.inputError)}
                type="datetime-local"
                value={show.endTime}
                min={show.startTime || undefined}
                aria-invalid={!!errors?.endTime || undefined}
                onChange={(e) => {
                  onUpdate({ endTime: e.target.value })
                  onFieldBlur?.("endTime")
                }}
                onBlur={() => onFieldBlur?.("endTime")}
                aria-label="Thời gian kết thúc"
              />
              <FieldError msg={errors?.endTime} />
            </div>
          </div>

          <div>
            <span className={styles.ticketLabel}>
              <span className={formStyles.required} aria-hidden="true">*</span>
              Loại vé
            </span>

            {show.tickets.length > 0 && (
              <ul className={styles.ticketList}>
                {show.tickets.map((ticket, i) => (
                  <li
                    key={ticket.id}
                    className={cn(
                      styles.ticketRow,
                      dragIndex === i && styles.dragging,
                      overIndex === i && dragIndex !== i && styles.dragOver
                    )}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setOverIndex(i)
                    }}
                    onDrop={() => drop(i)}
                    onDragEnd={() => {
                      setDragIndex(null)
                      setOverIndex(null)
                    }}
                  >
                    <span className={styles.grip} aria-hidden="true">
                      <GripVertical size={18} />
                    </span>
                    <span className={styles.ticketIcon} aria-hidden="true">
                      <Ticket size={18} />
                    </span>
                    <span className={styles.ticketName}>{ticket.name}</span>
                    <span className={styles.ticketMeta}>
                      {ticket.isFree ? "Miễn phí" : `${ticket.price.toLocaleString("vi-VN")}đ`}
                    </span>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={cn(styles.iconBtn, styles.editBtn)}
                        onClick={() => onEditTicket(ticket)}
                        aria-label={`Chỉnh sửa vé ${ticket.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className={cn(styles.iconBtn, styles.deleteBtn)}
                        onClick={() => onDeleteTicket(ticket.id)}
                        aria-label={`Xóa vé ${ticket.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.addTicketWrap}>
              <button type="button" className={styles.addTicketBtn} onClick={onAddTicket}>
                <PlusCircle size={20} />
                Tạo loại vé mới
              </button>
            </div>
            <FieldError msg={errors?.tickets} />
          </div>
        </>
      )}
    </div>
  )
}
