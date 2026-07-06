"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { SeatmapView } from "@/components/organizer/seatmap/SeatmapView"

/** Seat map ("Sơ đồ ghế"): ticket quantity picker + lock / invite tools. */
export default function EventSeatmapPage() {
  const { event } = useWorkspaceEvent()
  return <SeatmapView event={event} />
}
