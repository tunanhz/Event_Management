import { DEFAULT_DESCRIPTION_HTML, type CreateEventForm } from "./create-event-data"
import type { OrganizerEvent } from "../my-events-data"

/**
 * Seed a CreateEventForm from an existing event for the "Chỉnh sửa" flow.
 * The event model is lean, so unknown fields fall back to sensible defaults.
 */
export function mapEventToForm(event: OrganizerEvent): CreateEventForm {
  return {
    posterImage: event.image,
    bannerImage: event.image,
    name: event.title,
    locationType: "offline",
    venueName: event.venueName,
    province: "",
    ward: "",
    street: event.address,
    category: "",
    description: DEFAULT_DESCRIPTION_HTML,
    orgLogo: null,
    orgName: "",
    orgInfo: "",
  }
}
