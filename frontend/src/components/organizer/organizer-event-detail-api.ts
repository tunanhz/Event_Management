/**
 * Single-event detail API for the organizer management workspace
 * (/organizer/events/[id]/…). Loads GET /organizer/events/:id (the owned event
 * plus its ticket tiers) and maps it to the OrganizerEvent display shape the
 * workspace views consume. Complements organizer-my-events-api.ts (the list).
 */
import { clientApi } from "@/lib/client-api"
import { formatDateTime } from "@/lib/utils"
import type { OrganizerEvent } from "./my-events-data"
import { bucketFor, type ReviewStatus } from "./organizer-my-events-api"

/** One showing embedded on the event document (subset we read). */
export interface ServerEventShow {
  _id?: string
  title?: string
  startTime?: string
  endTime?: string
}

/** Raw event document returned by the detail endpoint (subset we read). */
export interface ServerEventFull {
  _id: string
  title?: string
  description?: string
  banner?: string
  imageUrl?: string
  posterImage?: string
  location?: string
  locationType?: "offline" | "online"
  venue?: { name?: string; province?: string; ward?: string; street?: string }
  startDate?: string
  endDate?: string
  date?: string
  categoryId?: string
  organizer?: string
  organizerLogoUrl?: string
  organizerDescription?: string
  shows?: ServerEventShow[]
  slug?: string
  privacy?: "public" | "private"
  confirmationMessage?: string
  logisticsServices?: string[]
  permitDocuments?: { name: string; url: string; sizeKb?: number }[]
  contract?: { repName?: string; agreed?: boolean; signatureUrl?: string }
  paymentInfo?: { bankName?: string; accountNumber?: string; accountHolder?: string }
  reviewStatus: ReviewStatus
  rejectionReason?: string
}

/** Raw ticket tier returned alongside the event. */
export interface ServerEventTicket {
  _id: string
  showId?: string
  ticketName: string
  description?: string
  price: number
  quantity: number
  soldQuantity?: number
  minPerOrder?: number
  maxPerOrder?: number
  image?: string
  saleStart?: string
  saleEnd?: string
}

export interface ServerEventDetail {
  event: ServerEventFull
  tickets: ServerEventTicket[]
}

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=480&h=270&fit=crop"

/**
 * Map the raw detail to the OrganizerEvent shape the workspace views consume.
 * Ticket tiers aggregate sold/total from the ticket collection; the backend has
 * no seat-lock concept yet, so `locked` is 0.
 */
export function detailToOrganizerEvent(detail: ServerEventDetail): OrganizerEvent {
  const { event, tickets } = detail
  const startISO = event.startDate || event.date
  return {
    id: event._id,
    title: event.title || "Sự kiện chưa đặt tên",
    image: event.banner || event.imageUrl || event.posterImage || PLACEHOLDER_IMG,
    dateTime: startISO ? formatDateTime(startISO) : "Chưa đặt lịch",
    venueName: event.venue?.name || event.location || "Chưa cập nhật",
    address: event.location || event.venue?.street || "Chưa cập nhật địa điểm",
    status: bucketFor(event.reviewStatus, startISO),
    reviewStatus: event.reviewStatus,
    rejectionReason: event.rejectionReason,
    ticketTypes: tickets.map((t) => ({
      id: t._id,
      name: t.ticketName,
      price: t.price,
      sold: t.soldQuantity ?? 0,
      total: t.quantity,
      locked: 0,
      showId: t.showId,
    })),
  }
}

/** Fetch a single owned event (detail + tickets) for the management workspace. */
export async function fetchOrganizerEventDetail(
  id: string
): Promise<{ event: OrganizerEvent; detail: ServerEventDetail }> {
  const res = await clientApi.get<{ data: ServerEventDetail }>(`/organizer/events/${id}`)
  return { event: detailToOrganizerEvent(res.data), detail: res.data }
}
