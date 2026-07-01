"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowLeft,
  PieChart,
  Megaphone,
  ClipboardList,
  CircleCheck,
  User,
  Pencil,
  Armchair,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import styles from "./organizer-shell.module.css"

interface NavItem {
  key: string
  name: string
  icon: LucideIcon
}

/** Sidebar groups for the per-event management workspace. */
const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Báo cáo",
    items: [
      { key: "summary", name: "Tổng kết", icon: PieChart },
      { key: "analytics", name: "Phân tích", icon: Megaphone },
      { key: "orders", name: "Danh sách đơn hàng", icon: ClipboardList },
      { key: "check-in", name: "Check-in", icon: CircleCheck },
    ],
  },
  {
    label: "Cài đặt sự kiện",
    items: [
      { key: "members", name: "Thành viên", icon: User },
      { key: "edit", name: "Chỉnh sửa", icon: Pencil },
      { key: "seatmap", name: "Sơ đồ ghế", icon: Armchair },
    ],
  },
]

/**
 * Left navigation shown while managing a single event. Replaces the main
 * Organizer sidebar; `onNavigate` closes the mobile drawer after a tap.
 */
export function EventWorkspaceSidebar({
  eventId,
  onNavigate,
}: {
  eventId: string
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const base = `/organizer/events/${eventId}`

  return (
    <aside className={styles.sidebar}>
      <Link href="/organizer" className={styles.sidebarBack} onClick={onNavigate}>
        <ArrowLeft size={20} aria-hidden="true" />
        Quản trị sự kiện
      </Link>

      <nav className={styles.nav} aria-label="Điều hướng quản trị sự kiện">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className={styles.navSectionLabel}>{group.label}</p>
            {group.items.map((item) => {
              const href = `${base}/${item.key}`
              const isActive = pathname === href
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(styles.navItem, isActive && styles.navItemActive)}
                >
                  <Icon size={20} aria-hidden="true" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className={styles.langBlock}>
        <p className={styles.langLabel}>Ngôn ngữ</p>
        <button
          type="button"
          className={styles.langToggle}
          aria-label="Chọn ngôn ngữ: Tiếng Việt"
        >
          <span>Vie</span>
          <span className={styles.flag} aria-hidden="true">
            🇻🇳
          </span>
        </button>
      </div>
    </aside>
  )
}
