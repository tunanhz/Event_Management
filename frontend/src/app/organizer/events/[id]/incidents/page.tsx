"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { OrganizerIncidentsView } from "@/components/organizer/manage/OrganizerIncidentsView"

/** Staff Incident Reports ("Báo cáo sự cố"): list of staff incidents for this event. */
export default function EventIncidentsPage() {
  const { event } = useWorkspaceEvent()
  return <OrganizerIncidentsView eventId={event.id} />
}
