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
  Send,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
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

const REVIEW_BADGE: Record<
  NonNullable<OrganizerEvent["reviewStatus"]>,
  { label: string; className: string }
> = {
  DRAFT: { label: "Nháp", className: styles.badgeDraft },
  PENDING_REVIEW: { label: "Chờ duyệt", className: styles.badgePending },
  PUBLISHED: { label: "Đã công bố", className: styles.badgePublished },
  REJECTED: { label: "Bị từ chối", className: styles.badgeRejected },
}

interface MyEventCardProps {
  event: OrganizerEvent
  /** Called when the organizer submits a DRAFT/REJECTED event for review. */
  onSubmit?: (id: string) => void
  submitting?: boolean
}

/** One organizer event: poster + details + status + a row of management actions. */
export function MyEventCard({ event, onSubmit, submitting }: MyEventCardProps) {
  const badge = event.reviewStatus ? REVIEW_BADGE[event.reviewStatus] : null
  const canSubmit =
    onSubmit && (event.reviewStatus === "DRAFT" || event.reviewStatus === "REJECTED")

  return (
    <article className={styles.card}>
      <div className={styles.top}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.image}
          alt={event.title}
          className={styles.image}
          width={240}
          height={135}
          loading="lazy"
        />

        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>{event.title}</h3>
            {badge && <span className={cn(styles.badge, badge.className)}>{badge.label}</span>}
          </div>

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

          {event.reviewStatus === "REJECTED" && event.rejectionReason && (
            <p className={styles.rejectBanner} role="alert">
              <strong>Lý do từ chối:</strong> {event.rejectionReason}
            </p>
          )}
        </div>

        {canSubmit && (
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => onSubmit(event.id)}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 size={16} className={styles.spin} aria-hidden="true" />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
            {event.reviewStatus === "REJECTED" ? "Gửi duyệt lại" : "Gửi duyệt"}
          </button>
        )}
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
