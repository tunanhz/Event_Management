import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import { EventSummaryView } from "@/components/organizer/summary/EventSummaryView"

/** Summary ("Tổng kết"): revenue overview, sales chart and ticket detail. */
export default async function EventSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  return <EventSummaryView event={event} />
}
