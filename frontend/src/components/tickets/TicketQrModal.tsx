"use client"

import { useEffect, useRef } from "react"
import { BrowserQRCodeSvgWriter } from "@zxing/browser"
import type { UserTicket } from "./tickets-data"
import styles from "./TicketQrModal.module.css"

interface TicketQrModalProps {
  ticket: UserTicket
  onClose: () => void
}

/** Full e-ticket view with a (demo) QR code, shown in an accessible dialog. */
export function TicketQrModal({ ticket, onClose }: TicketQrModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const qrRef = useRef<HTMLDivElement>(null)

  // Focus the close button on open, close on Esc, and lock body scroll.
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  useEffect(() => {
    const container = qrRef.current
    if (!container) return
    const writer = new BrowserQRCodeSvgWriter()
    const svg = writer.write(ticket.orderCode, 184, 184)
    svg.classList.add(styles.qr)
    svg.setAttribute("role", "img")
    svg.setAttribute("aria-label", `Mã QR cho vé ${ticket.orderCode}`)
    container.replaceChildren(svg)
    return () => container.replaceChildren()
  }, [ticket.orderCode])

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`${styles.dialog} animate-fade-up`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Đóng"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Gradient header band */}
        <div className={styles.headerBand}>
          <span className={styles.brand}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
              <path d="M13 5v2M13 11v2M13 17v2" />
            </svg>
            Vé điện tử EventBox
          </span>
          <h2 id="ticket-modal-title" className={styles.title}>
            {ticket.eventTitle}
          </h2>
        </div>

        {/* Perforated divider between header and stub */}
        <div className={styles.perforation} aria-hidden="true" />

        <div className={styles.stub}>
        {/* Real, scannable QR generated from the registration ticketCode. */}
        <div ref={qrRef} className={styles.qrFrame} />
        <p className={styles.orderCode}>#{ticket.orderCode}</p>
        <p className={styles.scanHint}>
          Xuất trình mã này tại cổng để soát vé
        </p>

        {/* Ticket details */}
        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>Thời gian</dt>
            <dd>
              {ticket.date} · {ticket.time}
            </dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Địa điểm</dt>
            <dd>{ticket.location}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Loại vé</dt>
            <dd>
              {ticket.ticketType} · SL {ticket.quantity}
            </dd>
          </div>
          {ticket.seat ? (
            <div className={styles.detailRow}>
              <dt>Vị trí</dt>
              <dd>{ticket.seat}</dd>
            </div>
          ) : null}
          <div className={styles.detailRow}>
            <dt>Tổng tiền</dt>
            <dd className={styles.total}>{ticket.totalPrice}</dd>
          </div>
        </dl>
        </div>
      </div>
    </div>
  )
}
