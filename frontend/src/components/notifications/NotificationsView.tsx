"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BellOff, CalendarClock, CheckCheck, CheckCircle2, CreditCard, Info, Trash2, Wallet, XCircle,
  type LucideIcon,
} from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"
import { useNotifications, type NotificationItem } from "@/lib/use-notifications"
import { NOTIFICATION_TYPE_LABELS, type NotificationType } from "./notifications-data"
import styles from "./notifications.module.css"

const TYPE_ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  event_approved: { icon: CheckCircle2, className: styles.iconGreen },
  event_rejected: { icon: XCircle, className: styles.iconRed },
  payment_success: { icon: CreditCard, className: styles.iconBlue },
  event_reminder: { icon: CalendarClock, className: styles.iconAmber },
  withdrawal: { icon: Wallet, className: styles.iconBlue },
  system: { icon: Info, className: styles.iconMuted },
}

/**
 * Notification centre (UC 32–34): list with unread filter, tap-to-expand
 * details (marks as read), per-item delete and mark-all-read. Mock feed;
 * read/deleted state persists in localStorage.
 */
export function NotificationsView() {
  const { notifications, unreadCount, markRead, markAllRead, remove } = useNotifications()
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const rows = onlyUnread ? notifications.filter((n) => !n.isRead) : notifications

  const open = (n: NotificationItem) => {
    setExpandedId((prev) => (prev === n.id ? null : n.id))
    if (!n.isRead) markRead(n.id)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headRow}>
        <div>
          <h1 className={styles.heading}>Thông báo</h1>
          <p className={styles.subheading}>
            {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc.` : "Bạn đã đọc tất cả thông báo."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className={styles.markAllBtn} onClick={markAllRead}>
            <CheckCheck size={16} aria-hidden="true" />
            Đánh dấu đã đọc
          </button>
        )}
      </div>

      <div className={styles.filterRow} role="tablist" aria-label="Lọc thông báo">
        <button
          type="button"
          role="tab"
          aria-selected={!onlyUnread}
          className={cn(styles.filterBtn, !onlyUnread && styles.filterBtnActive)}
          onClick={() => setOnlyUnread(false)}
        >
          Tất cả
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={onlyUnread}
          className={cn(styles.filterBtn, onlyUnread && styles.filterBtnActive)}
          onClick={() => setOnlyUnread(true)}
        >
          Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ""}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <BellOff size={44} aria-hidden="true" />
          <p>{onlyUnread ? "Không còn thông báo chưa đọc." : "Chưa có thông báo nào."}</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {rows.map((n) => {
            const { icon: Icon, className: iconClass } = TYPE_ICONS[n.type]
            const expanded = expandedId === n.id
            return (
              <li key={n.id} className={cn(styles.item, !n.isRead && styles.itemUnread)}>
                <button
                  type="button"
                  className={styles.itemMain}
                  aria-expanded={expanded}
                  onClick={() => open(n)}
                >
                  <span className={cn(styles.itemIcon, iconClass)} aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.itemTitleRow}>
                      <span className={styles.itemTitle}>{n.title}</span>
                      {!n.isRead && <span className={styles.unreadDot} aria-label="Chưa đọc" />}
                    </span>
                    <span className={cn(styles.itemMessage, expanded && styles.itemMessageFull)}>
                      {n.message}
                    </span>
                    <span className={styles.itemMeta}>
                      {NOTIFICATION_TYPE_LABELS[n.type]} · {formatDateTime(n.createdAt)}
                    </span>
                    {expanded && n.href && (
                      <Link href={n.href} className={styles.itemLink}>
                        Xem chi tiết →
                      </Link>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label={`Xóa thông báo “${n.title}”`}
                  onClick={() => remove(n.id)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
