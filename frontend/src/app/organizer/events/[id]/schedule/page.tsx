"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { ScheduleManagementView } from "@/components/organizer/schedule/ScheduleManagementView"

/** Schedule ("Lịch trình"): manage the event's shows (suất diễn). */
export default function EventSchedulePage() {
  const { event, detail, shows, refresh } = useWorkspaceEvent()

  // Tier count per show — a show still carrying tiers can't be deleted here.
  const ticketCounts: Record<string, number> = {}
  for (const t of detail.tickets) {
    if (t.showId) ticketCounts[t.showId] = (ticketCounts[t.showId] ?? 0) + 1
  }

  return (
    <ScheduleManagementView
      eventId={event.id}
      shows={shows}
      ticketCounts={ticketCounts}
      reviewStatus={event.reviewStatus}
      onSaved={refresh}
    />
  )
}
