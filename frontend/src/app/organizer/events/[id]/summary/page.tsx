"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { EventSummaryView } from "@/components/organizer/summary/EventSummaryView"

/** Summary ("Tổng kết"): revenue overview, sales chart and ticket detail. */
export default function EventSummaryPage() {
  const { event } = useWorkspaceEvent()
  return <EventSummaryView event={event} />
}
