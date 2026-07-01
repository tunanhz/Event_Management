import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import { CheckInView } from "@/components/organizer/checkin/CheckInView"

/** Check-in: attendance overview + per-ticket-type check-in detail. */
export default async function EventCheckInPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  return <CheckInView event={event} />
}
