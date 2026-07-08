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
  CreditCard,
  Banknote,
} from "lucide-react"
import { cn, formatVnd } from "@/lib/utils"
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
  APPROVED_WAITING_DEPOSIT: { label: "Chờ cọc 20%", className: styles.badgeWaitingDeposit ?? styles.badgePending },
  PUBLISHED: { label: "Đã công bố", className: styles.badgePublished },
  REJECTED: { label: "Bị từ chối", className: styles.badgeRejected },
}

interface MyEventCardProps {
  event: OrganizerEvent
  /** Called when the organizer submits a DRAFT/REJECTED event for review. */
  onSubmit?: (id: string) => void
  submitting?: boolean
  /** Called when the organizer pays the 20% deposit. */
  onPayDeposit?: (id: string) => void
  payingDeposit?: boolean
  /** Called when the organizer pays the remaining balance. */
  onPayRemaining?: (id: string) => void
  payingRemaining?: boolean
}

/** One organizer event: poster + details + status + a row of management actions. */
export function MyEventCard({
  event,
  onSubmit,
  submitting,
  onPayDeposit,
  payingDeposit,
  onPayRemaining,
  payingRemaining,
}: MyEventCardProps) {
  const badge = event.reviewStatus ? REVIEW_BADGE[event.reviewStatus] : null
  const canSubmit =
    onSubmit && (event.reviewStatus === "DRAFT" || event.reviewStatus === "REJECTED")
  const canDeposit =
    onPayDeposit && event.reviewStatus === "APPROVED_WAITING_DEPOSIT"
  const serviceCost = event.serviceCost ?? 0
  const depositAmount = event.depositAmount ?? 0
  const finalPaymentAmount = event.finalPaymentAmount || (serviceCost > 0 ? (serviceCost - depositAmount + (event.additionalCost ?? 0)) : 0)

  const canPayRemaining =
    onPayRemaining &&
    event.reviewStatus === "PUBLISHED" &&
    finalPaymentAmount > 0 &&
    event.finalPaymentStatus === "UNPAID"

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

          {/* Deposit info banner for APPROVED_WAITING_DEPOSIT */}
          {event.reviewStatus === "APPROVED_WAITING_DEPOSIT" && (event.serviceCost ?? 0) > 0 && (
            <div className={styles.depositBanner}>
              <p>
                <strong>Chi phí dịch vụ:</strong> {formatVnd(event.serviceCost ?? 0)}
                {" · "}
                <strong>Cọc 20%:</strong> {formatVnd(event.depositAmount ?? 0)}
              </p>
              <p className={styles.depositNote}>
                Vui lòng thanh toán cọc 20% để sự kiện được công bố lên trang công khai.
              </p>
            </div>
          )}

          {/* Final payment info for published events with outstanding balance */}
          {canPayRemaining && (
            <div className={styles.depositBanner}>
              <p>
                <strong>Thanh toán sau sự kiện:</strong> {formatVnd(finalPaymentAmount)}
                {(event.additionalCost ?? 0) > 0 && (
                  <span> (bao gồm phát sinh: {formatVnd(event.additionalCost ?? 0)})</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.actionBtns}>
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

          {canDeposit && (
            <button
              type="button"
              className={styles.depositBtn}
              onClick={() => onPayDeposit(event.id)}
              disabled={payingDeposit}
            >
              {payingDeposit ? (
                <Loader2 size={16} className={styles.spin} aria-hidden="true" />
              ) : (
                <CreditCard size={16} aria-hidden="true" />
              )}
              Đóng cọc 20%
            </button>
          )}

          {canPayRemaining && (
            <button
              type="button"
              className={styles.depositBtn}
              onClick={() => onPayRemaining!(event.id)}
              disabled={payingRemaining}
            >
              {payingRemaining ? (
                <Loader2 size={16} className={styles.spin} aria-hidden="true" />
              ) : (
                <Banknote size={16} aria-hidden="true" />
              )}
              Thanh toán nốt
            </button>
          )}
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
