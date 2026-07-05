"use client"

import Link from "next/link"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/lib/use-notifications"
import styles from "./notification-bell.module.css"

/**
 * Header bell linking to /thong-bao with a live unread badge.
 * `className` lets each header (desktop/mobile) apply its own button styling.
 */
export function NotificationBell({ className }: { className?: string }) {
  const { unreadCount } = useNotifications()

  return (
    <Link
      href="/thong-bao"
      className={cn(styles.bell, className)}
      aria-label={unreadCount > 0 ? `Thông báo — ${unreadCount} chưa đọc` : "Thông báo"}
    >
      <Bell size={19} aria-hidden="true" />
      {unreadCount > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  )
}
