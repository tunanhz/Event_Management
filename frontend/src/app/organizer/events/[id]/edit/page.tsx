import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import { EventWizard } from "@/components/organizer/create-event/EventWizard"
import { mapEventToForm } from "@/components/organizer/create-event/map-event-to-form"

/** Edit ("Chỉnh sửa"): the create-event wizard pre-filled with event data. */
export default async function EventEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  return <EventWizard initialForm={mapEventToForm(event)} />
}
