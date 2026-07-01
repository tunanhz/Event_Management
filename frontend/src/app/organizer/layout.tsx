"use client"

import { useState } from "react"
import { OrganizerTopbar } from "@/components/organizer/OrganizerTopbar"
import { OrganizerSidebar } from "@/components/organizer/OrganizerSidebar"
import { OrganizerShellProvider } from "@/components/organizer/OrganizerShellContext"
import styles from "@/components/organizer/organizer-shell.module.css"

/** Organizer Center shell: full-width top bar + left sidebar + scrollable content. */
export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <OrganizerShellProvider>
    <div className={styles.shell}>
      <OrganizerTopbar onMenuClick={() => setDrawerOpen(true)} />

      {drawerOpen && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className={styles.drawer}>
            <OrganizerSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <div className={styles.body}>
        <OrganizerSidebar />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
    </OrganizerShellProvider>
  )
}
