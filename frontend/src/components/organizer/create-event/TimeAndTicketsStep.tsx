"use client"

import { useState } from "react"
import { PlusCircle, ChevronDown } from "lucide-react"
import { EventShowCard } from "./EventShowCard"
import { TicketTypeModal } from "./TicketTypeModal"
import {
  createEmptyShow,
  type CreateEventForm,
  type EventShow,
  type TicketType,
} from "./create-event-data"
import pageStyles from "@/app/organizer/create-event/create-event.module.css"
import styles from "./time-and-tickets.module.css"

interface TimeAndTicketsStepProps {
  form: CreateEventForm
  update: (patch: Partial<CreateEventForm>) => void
}

/** Which show's ticket modal is open — editing (ticket set) or creating (null). */
type ModalState = { showId: string; ticket: TicketType | null } | null

/** Dropdown/display label for one show: its title or an auto-numbered fallback. */
export function showLabel(show: { title?: string }, index: number): string {
  return show.title?.trim() || `Suất ${index + 1}`
}

/**
 * Step 2 of the create-event wizard. Manages the list of shows (suất diễn),
 * each with its own optional label, date range and ticket tiers
 * (created/edited via {@link TicketTypeModal}).
 */
export function TimeAndTicketsStep({ form, update }: TimeAndTicketsStepProps) {
  const [modal, setModal] = useState<ModalState>(null)
  // "all" shows everything; otherwise a single show id.
  const [filter, setFilter] = useState<string>("all")

  const setShows = (shows: EventShow[]) => update({ shows })

  const patchShow = (showId: string, patch: Partial<EventShow>) =>
    setShows(form.shows.map((s) => (s.id === showId ? { ...s, ...patch } : s)))

  const addShow = () => setShows([...form.shows, createEmptyShow()])

  const deleteShow = (showId: string) => {
    setShows(form.shows.filter((s) => s.id !== showId))
    if (filter === showId) setFilter("all")
  }

  const saveTicket = (ticket: TicketType) => {
    if (!modal) return
    const show = form.shows.find((s) => s.id === modal.showId)
    if (!show) return
    const exists = show.tickets.some((t) => t.id === ticket.id)
    const tickets = exists
      ? show.tickets.map((t) => (t.id === ticket.id ? ticket : t))
      : [...show.tickets, ticket]
    patchShow(modal.showId, { tickets })
    setModal(null)
  }

  const deleteTicket = (showId: string, ticketId: string) => {
    const show = form.shows.find((s) => s.id === showId)
    if (!show) return
    patchShow(showId, { tickets: show.tickets.filter((t) => t.id !== ticketId) })
  }

  const visibleShows =
    filter === "all" ? form.shows : form.shows.filter((s) => s.id === filter)

  const modalShow = modal ? form.shows.find((s) => s.id === modal.showId) : undefined

  return (
    <div className={pageStyles.form}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Thời gian và Loại vé</h1>
        <div className={styles.headerActions}>
          <button type="button" className={styles.createShowBtn} onClick={addShow}>
            Tạo suất diễn
            <PlusCircle size={18} />
          </button>
          <div className={styles.filterWrap}>
            <select
              className={styles.filterSelect}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Lọc suất diễn"
            >
              <option value="all">Tất cả</option>
              {form.shows.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {showLabel(s, i)}
                </option>
              ))}
            </select>
            <ChevronDown size={18} className={styles.filterChevron} aria-hidden="true" />
          </div>
        </div>
      </div>

      {visibleShows.length === 0 ? (
        <p className={styles.emptyShows}>
          Chưa có suất diễn nào. Nhấn “Tạo suất diễn” để bắt đầu.
        </p>
      ) : (
        <div className={styles.showList}>
          {visibleShows.map((show) => (
            <EventShowCard
              key={show.id}
              show={show}
              index={form.shows.findIndex((s) => s.id === show.id) + 1}
              canDelete={form.shows.length > 1}
              onUpdate={(patch) => patchShow(show.id, patch)}
              onDelete={() => deleteShow(show.id)}
              onAddTicket={() => setModal({ showId: show.id, ticket: null })}
              onEditTicket={(ticket) => setModal({ showId: show.id, ticket })}
              onDeleteTicket={(ticketId) => deleteTicket(show.id, ticketId)}
              onReorderTickets={(tickets) => patchShow(show.id, { tickets })}
            />
          ))}
        </div>
      )}

      {modal && (
        <TicketTypeModal
          ticket={modal.ticket}
          showEndTime={modalShow?.endTime ?? ""}
          onClose={() => setModal(null)}
          onSave={saveTicket}
        />
      )}
    </div>
  )
}
