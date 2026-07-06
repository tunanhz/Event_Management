"use client"

import { useParams } from "next/navigation"
import { EventWorkspaceProvider } from "@/components/organizer/EventWorkspaceContext"
import styles from "@/components/organizer/manage/event-manage.module.css"

/**
 * Shell for a single event's management workspace. Loads the event once via the
 * workspace provider (shared by every sub-page) from the live API — the sidebar
 * lives in the parent organizer layout, which swaps to the event nav here.
 */
export default function EventManageLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const id = params?.id
  if (!id) return null

  return (
    <div className={styles.wrap}>
      <EventWorkspaceProvider key={id} eventId={id}>
        {children}
      </EventWorkspaceProvider>
    </div>
  )
}
