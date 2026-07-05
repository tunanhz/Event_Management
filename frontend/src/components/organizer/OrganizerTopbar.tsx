"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ticket, ChevronDown, Plus, Menu } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { OrganizerAccountMenu } from "./OrganizerAccountMenu"
import { useOrganizerShell } from "./OrganizerShellContext"
import styles from "./organizer-shell.module.css"

/**
 * Top bar for the Organizer Center: brand block (left, aligned with sidebar),
 * plus the "Tạo sự kiện" action and account menu on the right.
 */
export function OrganizerTopbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const { title } = useOrganizerShell()

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

        <OrganizerAccountMenu />
      </div>
    </header>
  )
}
