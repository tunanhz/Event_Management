"use client"

import Link from "next/link"
import {
  CalendarDays,
  MapPin,
  PieChart,
  Users,
  Receipt,
  Armchair,
  Pencil,
} from "lucide-react"
import type { OrganizerEvent } from "./my-events-data"
import styles from "./MyEventCard.module.css"

/**
 * Management actions under each event. `href` is a builder so links resolve to
 * the real per-event routes (edit reuses the existing create-event wizard).
 */
const ACTIONS = [
  { key: "summary", label: "Tổng quan", Icon: PieChart, href: (id: string) => `/organizer/events/${id}/summary` },
  { key: "members", label: "Thành viên", Icon: Users, href: (id: string) => `/organizer/events/${id}/members` },
  { key: "orders", label: "Đơn hàng", Icon: Receipt, href: (id: string) => `/organizer/events/${id}/orders` },
  { key: "seatmap", label: "Sơ đồ ghế", Icon: Armchair, href: (id: string) => `/organizer/events/${id}/seatmap` },
  { key: "edit", label: "Chỉnh sửa", Icon: Pencil, href: (id: string) => `/organizer/events/${id}/edit` },
] as const

/** One organizer event: poster + details + a row of management actions. */
export function MyEventCard({ event }: { event: OrganizerEvent }) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <img
          src={event.image}
          alt={event.title}
          className={styles.image}
          width={240}
          height={135}
          loading="lazy"
        />

        <div className={styles.info}>
          <h3 className={styles.title}>{event.title}</h3>

          <p className={styles.metaRow}>
            <CalendarDays size={17} className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaStrong}>{event.dateTime}</span>
          </p>

          <p className={styles.metaRow}>
            <MapPin size={17} className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.venue}>
              <span className={styles.metaStrong}>{event.venueName}</span>
              <span className={styles.address}>{event.address}</span>
            </span>
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        {ACTIONS.map(({ key, label, Icon, href }) => (
          <Link key={key} href={href(event.id)} className={styles.action}>
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </article>
  )
}
