"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { getAttendeesByEventId } from "@/components/organizer/manage/attendee-tracker-data"
import { AttendeeTrackerView } from "@/components/organizer/manage/AttendeeTrackerView"

/** Orders ("Đơn hàng"): attendee tracker for the event. */
export default function EventOrdersPage() {
  const { event } = useWorkspaceEvent()
  const attendees = getAttendeesByEventId(event.id)
  return (
    <AttendeeTrackerView eventId={event.id} eventTitle={event.title} attendees={attendees} />
  )
}
