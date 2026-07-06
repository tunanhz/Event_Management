"use client"

import Link from "next/link"
import { ticketStatusMeta, type UserTicket } from "./tickets-data"
import styles from "./TicketCard.module.css"

interface TicketCardProps {
  ticket: UserTicket
  index?: number
  onViewTicket: (ticket: UserTicket) => void
}

/** A single purchased ticket, styled as a real perforated event ticket. */
export function TicketCard({ ticket, index = 0, onViewTicket }: TicketCardProps) {
  const status = ticketStatusMeta[ticket.status]
  const canViewQr = ticket.status !== "cancelled"

  // Split "DD/MM/YYYY" into a calendar-chip day + month.
  const day = ticket.date.slice(0, 2)
  const monthLabel = `Thg ${Number(ticket.date.slice(3, 5))}`

  return (
    <article
      className={`${styles.card} ${styles[`accent_${status.tone}`]} animate-fade-up`}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {/* Poster / stub image */}
      <Link
        href={`/su-kien/${ticket.eventId}`}
        className={styles.poster}
        aria-label={`Xem sự kiện ${ticket.eventTitle}`}
      >
        <img
          src={ticket.image}
          alt={ticket.eventTitle}
          className={styles.image}
          width={220}
          height={220}
          loading="lazy"
        />
        <span className={styles.posterShade} aria-hidden="true" />
        <span className={styles.dateChip}>
          <span className={styles.dateDay}>{day}</span>
          <span className={styles.dateMonth}>{monthLabel}</span>
        </span>
        <span className={`${styles.statusBadge} ${styles[status.tone]}`}>
          {status.label}
        </span>
      </Link>

      {/* Ticket body (right stub) */}
      <div className={styles.body}>
        <span className={styles.orderCode}>#{ticket.orderCode}</span>

        <Link href={`/su-kien/${ticket.eventId}`} className={styles.title}>
          {ticket.eventTitle}
        </Link>

        <ul className={styles.meta}>
          <li className={styles.metaItem}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>
              {ticket.date} · {ticket.time}
            </span>
          </li>
          <li className={styles.metaItem}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{ticket.location}</span>
          </li>
          <li className={styles.metaItem}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2M13 11v2M13 17v2" />
            </svg>
            <span>
              {ticket.ticketType} · SL {ticket.quantity}
              {ticket.seat ? ` · ${ticket.seat}` : ""}
            </span>
          </li>
        </ul>

        <div className={styles.footer}>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Tổng tiền</span>
            <span className={styles.price}>{ticket.totalPrice}</span>
          </div>
          {canViewQr ? (
            <button
              type="button"
              className={styles.viewBtn}
              onClick={() => onViewTicket(ticket)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3h-3zM21 14v7M17 21h4" />
              </svg>
              Xem vé
            </button>
          ) : (
            <span className={styles.refundNote}>Đã hoàn tiền</span>
          )}
        </div>
      </div>
    </article>
  )
}
