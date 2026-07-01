"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { TicketCard } from "./TicketCard"
import { TicketQrModal } from "./TicketQrModal"
import {
  myTickets,
  ticketTabs,
  type TicketStatus,
  type UserTicket,
} from "./tickets-data"
import styles from "./MyTicketsView.module.css"

/** Interactive shell for /ve-cua-toi: status tabs + ticket list + QR modal. */
export function MyTicketsView() {
  const [activeTab, setActiveTab] = useState<TicketStatus>("upcoming")
  const [selected, setSelected] = useState<UserTicket | null>(null)

  // Count per status once — used for the tab badges.
  const counts = useMemo(() => {
    return myTickets.reduce(
      (acc, t) => {
        acc[t.status] += 1
        return acc
      },
      { upcoming: 0, used: 0, cancelled: 0 } as Record<TicketStatus, number>
    )
  }, [])

  const visible = useMemo(
    () => myTickets.filter((t) => t.status === activeTab),
    [activeTab]
  )

  return (
    <section className={styles.container}>
      <header className={styles.pageHeader}>
        <span className={styles.headerIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2M13 11v2M13 17v2" />
          </svg>
        </span>
        <div>
          <h1 className={styles.pageTitle}>Vé của tôi</h1>
          <p className={styles.pageSubtitle}>
            Quản lý và xem vé điện tử cho các sự kiện bạn đã đặt.
          </p>
        </div>
      </header>

      {/* Status tabs */}
      <div className={styles.tabs} role="tablist" aria-label="Lọc vé theo trạng thái">
        {ticketTabs.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className={styles.tabCount}>{counts[tab.key]}</span>
            </button>
          )
        })}
      </div>

      {/* Ticket list or empty state */}
      {visible.length > 0 ? (
        <div className={styles.list}>
          {visible.map((ticket, i) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              index={i}
              onViewTicket={setSelected}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M13 5v2M13 11v2M13 17v2" />
          </svg>
          <p className={styles.emptyTitle}>Chưa có vé nào ở đây</p>
          <p className={styles.emptyText}>
            Khám phá các sự kiện hấp dẫn và đặt vé ngay hôm nay.
          </p>
          <Link href="/su-kien" className={styles.emptyCta}>
            Khám phá sự kiện
          </Link>
        </div>
      )}

      {selected ? (
        <TicketQrModal ticket={selected} onClose={() => setSelected(null)} />
      ) : null}
    </section>
  )
}
