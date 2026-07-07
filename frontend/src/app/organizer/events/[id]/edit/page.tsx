"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { EventWizard } from "@/components/organizer/create-event/EventWizard"
import { mapDetailToForm } from "@/components/organizer/create-event/map-event-to-form"
import { PublishedInventoryPanel } from "@/components/organizer/inventory/PublishedInventoryPanel"

/**
 * Edit ("Chỉnh sửa") — adapts to the event's review lifecycle:
 *  - DRAFT / REJECTED  → full create-event wizard, pre-filled and editable.
 *  - PENDING_REVIEW    → the same wizard locked read-only (in the admin queue).
 *  - PUBLISHED (not started) → stock-only inventory manager (restock / hide-show),
 *                              allowed only while tickets are on sale (before it begins).
 *  - PUBLISHED (started)     → inventory view-only: stock is frozen once the event
 *                              is under way or over. Mirrors the backend guard.
 * `event.status` ("past" = started, per the data layer's start-date bucketing) is
 * precomputed, so there's no render-time clock read here.
 */
export default function EventEditPage() {
  const { event, detail } = useWorkspaceEvent()
  const status = detail.event.reviewStatus

  if (status === "PUBLISHED") {
    return <PublishedInventoryPanel eventId={event.id} readOnly={event.status === "past"} />
  }

  return (
    <EventWizard
      initialForm={mapDetailToForm(detail)}
      eventId={event.id}
      readOnly={status === "PENDING_REVIEW"}
    />
  )
}
