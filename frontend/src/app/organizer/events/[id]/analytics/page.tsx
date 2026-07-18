"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { AnalyticsView } from "@/components/organizer/analytics/AnalyticsView"

/** Analytics ("Phân tích"): real sales & revenue statistics for the event. */
export default function EventAnalyticsPage() {
  const { event } = useWorkspaceEvent()
  return <AnalyticsView eventId={event.id} />
}
