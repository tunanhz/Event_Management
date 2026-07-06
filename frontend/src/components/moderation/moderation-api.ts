/**
 * Admin event-moderation API layer — wires the moderation screens to the real
 * backend (`/api/admin/events`). Maps the backend review lifecycle
 * (DRAFT/PENDING_REVIEW/PUBLISHED/REJECTED) onto the UI's ModerationStatus
 * (pending/approved/rejected).
 */
import { clientApi } from "@/lib/client-api"
import type { ModerationEvent, ModerationStatus } from "@/types"
import type {
  ModerationDocument,
  ModerationEventDetail,
  ModerationTicketType,
} from "./moderation-detail-data"

/** Backend reviewStatus for each moderation tab. */
const REVIEW_STATUS_BY_TAB: Record<ModerationStatus, string> = {
  pending: "PENDING_REVIEW",
  approved: "PUBLISHED",
  rejected: "REJECTED",
}

function toModerationStatus(reviewStatus: string): ModerationStatus {
  if (reviewStatus === "PUBLISHED") return "approved"
  if (reviewStatus === "REJECTED") return "rejected"
  return "pending"
}

/** Populated refs the admin endpoints return (categoryId/creatorId). */
interface PopulatedRef {
  _id?: string
  name?: string
  fullName?: string
  email?: string
}

interface ServerEvent {
  _id: string
  title: string
  organizer?: string
  creatorId?: PopulatedRef | string
  category?: string
  categoryId?: PopulatedRef | string
  location?: string
  reviewStatus: string
  updatedAt?: string
  createdAt?: string
  description?: string
  startDate?: string
  endDate?: string
  capacity?: number
  rejectionReason?: string
  permitDocuments?: { name: string; url?: string; sizeKb?: number }[]
  contract?: { repName?: string; signatureUrl?: string }
}

interface ServerTicket {
  ticketName: string
  price: number
  quantity: number
  saleStart?: string
  saleEnd?: string
}

function refField(ref: PopulatedRef | string | undefined, key: "name" | "fullName" | "email"): string {
  return ref && typeof ref === "object" ? ref[key] ?? "" : ""
}

function toModerationEvent(e: ServerEvent): ModerationEvent {
  return {
    id: e._id,
    title: e.title,
    organizer: e.organizer || refField(e.creatorId, "fullName") || "—",
    category: e.category || refField(e.categoryId, "name") || "—",
    location: e.location || "—",
    // updatedAt ≈ submission time for a PENDING_REVIEW row.
    submittedAt: e.updatedAt || e.createdAt || new Date().toISOString(),
    status: toModerationStatus(e.reviewStatus),
  }
}

/** List one moderation tab's events (pending / approved / rejected). */
export async function fetchModerationQueue(tab: ModerationStatus): Promise<ModerationEvent[]> {
  const res = await clientApi.get<{ data: ServerEvent[] }>(
    `/admin/events?reviewStatus=${REVIEW_STATUS_BY_TAB[tab]}&limit=100`
  )
  return (res.data ?? []).map(toModerationEvent)
}

/** Full detail for the admin review panel (event + tickets + documents). */
export async function fetchModerationDetail(id: string): Promise<ModerationEventDetail> {
  const res = await clientApi.get<{ data: { event: ServerEvent; tickets: ServerTicket[] } }>(
    `/admin/events/${id}`
  )
  const e = res.data.event
  const tickets: ModerationTicketType[] = (res.data.tickets ?? []).map((t) => ({
    name: t.ticketName,
    price: t.price,
    quantity: t.quantity,
    saleStart: t.saleStart ?? "",
    saleEnd: t.saleEnd ?? "",
  }))
  const documents: ModerationDocument[] = (e.permitDocuments ?? []).map((d) => ({
    name: d.name,
    type: "permit",
    sizeKb: d.sizeKb ?? 0,
  }))
  if (e.contract?.signatureUrl) {
    documents.push({ name: "Hợp đồng dịch vụ đã ký", type: "contract", sizeKb: 0 })
  }
  return {
    ...toModerationEvent(e),
    description: e.description || "",
    startDate: e.startDate || "",
    endDate: e.endDate || "",
    capacity: e.capacity ?? 0,
    organizerEmail: refField(e.creatorId, "email") || "—",
    organizerPhone: "—",
    tickets,
    documents,
    rejectionReason: e.rejectionReason,
  }
}

/** PENDING_REVIEW → PUBLISHED. */
export async function approveEvent(id: string): Promise<void> {
  await clientApi.post(`/admin/events/${id}/approve`, {})
}

/** PENDING_REVIEW → REJECTED with a correction reason. */
export async function rejectEvent(id: string, reason: string): Promise<void> {
  await clientApi.post(`/admin/events/${id}/reject`, { reason })
}
