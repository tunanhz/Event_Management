"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { OrganizerTopbar } from "@/components/organizer/OrganizerTopbar"
import { OrganizerSidebar } from "@/components/organizer/OrganizerSidebar"
import { EventWorkspaceSidebar } from "@/components/organizer/EventWorkspaceSidebar"
import { OrganizerShellProvider } from "@/components/organizer/OrganizerShellContext"
import styles from "@/components/organizer/organizer-shell.module.css"

/** Organizer Center shell: full-width top bar + left sidebar + scrollable content. */
export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Inside a single event's workspace (/organizer/events/[id]/…) swap the main
  // navigation for the event-management sidebar.
  const eventId = pathname.match(/^\/organizer\/events\/([^/]+)/)?.[1]

  const renderSidebar = (onNavigate?: () => void) =>
    eventId ? (
      <EventWorkspaceSidebar eventId={eventId} onNavigate={onNavigate} />
    ) : (
      <OrganizerSidebar onNavigate={onNavigate} />
    )

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
              {renderSidebar(() => setDrawerOpen(false))}
            </div>
          </>
        )}

        <div className={styles.body}>
          {renderSidebar()}
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </OrganizerShellProvider>
  )
}
