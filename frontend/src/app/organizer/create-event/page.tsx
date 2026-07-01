"use client"

import { EventWizard } from "@/components/organizer/create-event/EventWizard"
import { INITIAL_FORM } from "@/components/organizer/create-event/create-event-data"

/** "Tạo sự kiện" — the event creation wizard, starting from an empty form. */
export default function CreateEventPage() {
  return <EventWizard initialForm={INITIAL_FORM} />
}
