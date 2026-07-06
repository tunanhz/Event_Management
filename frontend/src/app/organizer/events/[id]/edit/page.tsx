"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { EventWizard } from "@/components/organizer/create-event/EventWizard"
import { mapDetailToForm } from "@/components/organizer/create-event/map-event-to-form"

/** Edit ("Chỉnh sửa"): the create-event wizard pre-filled with the saved event.
 *  Passing eventId makes saves update this event instead of creating a new one. */
export default function EventEditPage() {
  const { event, detail } = useWorkspaceEvent()
  return <EventWizard initialForm={mapDetailToForm(detail)} eventId={event.id} />
}
