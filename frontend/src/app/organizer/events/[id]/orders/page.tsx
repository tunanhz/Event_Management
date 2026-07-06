import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import { getAttendeesByEventId } from "@/components/organizer/manage/attendee-tracker-data"
import { AttendeeTrackerView } from "@/components/organizer/manage/AttendeeTrackerView"

/** Orders ("Đơn hàng"): attendee tracker for the event. */
export default async function EventOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  const attendees = getAttendeesByEventId(id)

  return <AttendeeTrackerView eventId={id} eventTitle={event.title} attendees={attendees} />
}
