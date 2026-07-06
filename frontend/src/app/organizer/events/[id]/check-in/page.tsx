"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { CheckInView } from "@/components/organizer/checkin/CheckInView"

/** Check-in: attendance overview + per-ticket-type check-in detail. */
export default function EventCheckInPage() {
  const { event } = useWorkspaceEvent()
  return <CheckInView event={event} />
}
