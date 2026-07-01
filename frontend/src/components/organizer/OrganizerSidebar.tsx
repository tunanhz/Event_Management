"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star, FolderOpen, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import styles from "./organizer-shell.module.css"

const NAV_ITEMS = [
  { name: "Sự kiện của tôi", href: "/organizer", icon: Star },
  { name: "Quản lý báo cáo", href: "/organizer/reports", icon: FolderOpen },
  { name: "Điều khoản cho Ban tổ chức", href: "/organizer/terms", icon: FileText },
]

/**
 * Left navigation for the Organizer Center. Rendered inline on desktop and
 * inside the mobile drawer. `onNavigate` closes the drawer after a tap.
 */
export function OrganizerSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav} aria-label="Điều hướng Organizer Center">
        {NAV_ITEMS.map((item) => {
          // Exact match for the root item; prefix match keeps sub-routes
          // (e.g. a term PDF viewer) highlighting their parent nav item.
          const isActive =
            pathname === item.href ||
            (item.href !== "/organizer" && pathname.startsWith(`${item.href}/`))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(styles.navItem, isActive && styles.navItemActive)}
            >
              <Icon size={20} aria-hidden="true" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className={styles.langBlock}>
        <p className={styles.langLabel}>Ngôn ngữ</p>
        <button type="button" className={styles.langToggle} aria-label="Chọn ngôn ngữ: Tiếng Việt">
          <span>Vie</span>
          <span className={styles.flag} aria-hidden="true">🇻🇳</span>
        </button>
      </div>
    </aside>
  )
}
