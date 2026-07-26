"use client"

import { EventWizard } from "@/components/organizer/create-event/EventWizard"
import { ScrollToTopButton } from "@/components/organizer/create-event/ScrollToTopButton"
import { INITIAL_FORM } from "@/components/organizer/create-event/create-event-data"

/** "Tạo sự kiện" — the event creation wizard, starting from an empty form.
 *  Finishing the last step saves the draft and lands on the "Nháp" tab of the
 *  organizer's event list. */
export default function CreateEventPage() {
  return (
    <>
      <EventWizard initialForm={INITIAL_FORM} finishHref="/organizer?tab=draft" />
      <ScrollToTopButton />
    </>
  )
}
