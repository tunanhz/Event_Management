import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import { SeatmapView } from "@/components/organizer/seatmap/SeatmapView"

/** Seat map ("Sơ đồ ghế"): ticket quantity picker + lock / invite tools. */
export default async function EventSeatmapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  return <SeatmapView event={event} />
}
