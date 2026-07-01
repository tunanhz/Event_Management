"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ticket, ChevronDown, Plus, Menu } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { useOrganizerShell } from "./OrganizerShellContext"
import styles from "./organizer-shell.module.css"

/**
 * Top bar for the Organizer Center: brand block (left, aligned with sidebar),
 * plus the "Tạo sự kiện" action and account menu on the right.
 */
export function OrganizerTopbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const { user } = useAuth()
  const { title } = useOrganizerShell()
  const initial = user?.fullName?.charAt(0).toUpperCase() ?? "T"

  return (
    <header className={styles.topbar}>
      <Link href="/organizer" className={styles.brand} aria-label="Organizer Center">
        <span className={styles.brandLogo}>
          <Ticket size={20} aria-hidden="true" />
        </span>
        <span className={styles.brandText}>Organizer Center</span>
        <ChevronDown size={16} className={styles.brandChevron} aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={onMenuClick}
        className={styles.menuBtn}
        aria-label="Mở menu điều hướng"
      >
        <Menu size={22} />
      </button>

      {title && <h1 className={styles.pageTitle}>{title}</h1>}

      <div className={styles.topbarActions}>
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => router.push("/organizer/create-event")}
        >
          <Plus size={18} aria-hidden="true" />
          Tạo sự kiện
        </button>

        <ThemeToggle className={styles.iconBtn} />

        <button type="button" className={styles.account} aria-label="Tài khoản">
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={user.fullName} className={styles.avatar} />
          ) : (
            <span className={styles.avatar} aria-hidden="true">{initial}</span>
          )}
          <span className={styles.accountName}>{user?.fullName ?? "Tài khoản"}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
