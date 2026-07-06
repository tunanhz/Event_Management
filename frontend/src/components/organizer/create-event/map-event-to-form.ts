import {
  DEFAULT_DESCRIPTION_HTML,
  createEmptyShow,
  type CreateEventForm,
  type EventShow,
  type TicketType,
} from "./create-event-data"
import type {
  ServerEventDetail,
  ServerEventTicket,
} from "../organizer-event-detail-api"

/**
 * ISO timestamp → `datetime-local` value (YYYY-MM-DDTHH:mm) in local time, so the
 * wizard's date inputs show the same wall-clock the organizer originally picked
 * (saveEventDraft converts it back to ISO on save).
 */
function isoToLocalInput(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

function mapTicket(t: ServerEventTicket): TicketType {
  return {
    id: t._id,
    name: t.ticketName,
    price: t.price,
    isFree: t.price === 0,
    quantity: t.quantity,
    minPerOrder: t.minPerOrder ?? 1,
    maxPerOrder: t.maxPerOrder ?? 10,
    saleStart: isoToLocalInput(t.saleStart),
    saleEnd: isoToLocalInput(t.saleEnd),
    description: t.description ?? "",
    image: t.image ?? null,
  }
}

/**
 * Seed a CreateEventForm from a saved event's detail for the "Chỉnh sửa" flow.
 * Shows keep their server _id (so a re-save updates them instead of recreating),
 * and tickets are grouped back under their show via Ticket.showId. Tickets with
 * no matching show (legacy flat events) fall under the first show.
 */
export function mapDetailToForm(detail: ServerEventDetail): CreateEventForm {
  const { event, tickets } = detail

  const shows: EventShow[] = (event.shows ?? [])
    .filter((s) => s._id)
    .map((s) => ({
      id: s._id as string,
      startTime: isoToLocalInput(s.startTime),
      endTime: isoToLocalInput(s.endTime),
      tickets: tickets.filter((t) => t.showId === s._id).map(mapTicket),
    }))

  const orphanTickets = tickets.filter(
    (t) => !t.showId || !shows.some((s) => s.id === t.showId)
  )
  if (orphanTickets.length > 0) {
    if (shows.length === 0) {
      shows.push({ ...createEmptyShow(), tickets: orphanTickets.map(mapTicket) })
    } else {
      shows[0].tickets.push(...orphanTickets.map(mapTicket))
    }
  }

  return {
    posterImage: event.posterImage ?? null,
    bannerImage: event.banner ?? event.imageUrl ?? null,
    name: event.title ?? "",
    locationType: event.locationType ?? "offline",
    venueName: event.venue?.name ?? "",
    province: event.venue?.province ?? "",
    ward: event.venue?.ward ?? "",
    street:
      event.locationType === "online"
        ? event.location ?? ""
        : event.venue?.street ?? "",
    category: event.categoryId ?? "",
    description: event.description || DEFAULT_DESCRIPTION_HTML,
    orgLogo: event.organizerLogoUrl ?? null,
    orgName: event.organizer ?? "",
    orgInfo: event.organizerDescription ?? "",
    shows: shows.length > 0 ? shows : [createEmptyShow()],
    slug: event.slug ?? "",
    privacy: event.privacy ?? "public",
    confirmationMessage: event.confirmationMessage ?? "",
    enableQuestions: event.enableQuestions ?? false,
    logisticsServices: event.logisticsServices ?? [],
    permitDocuments: (event.permitDocuments ?? []).map((d, i) => ({
      id: `permit-${i}-${d.url}`,
      name: d.name,
      sizeKb: d.sizeKb ?? 0,
      url: d.url,
    })),
    contractRepName: event.contract?.repName ?? "",
    contractAgreed: event.contract?.agreed ?? false,
    signatureDataUrl: event.contract?.signatureUrl ?? null,
    bankName: event.paymentInfo?.bankName ?? "",
    bankAccountNumber: event.paymentInfo?.accountNumber ?? "",
    bankAccountHolder: event.paymentInfo?.accountHolder ?? "",
  }
}
