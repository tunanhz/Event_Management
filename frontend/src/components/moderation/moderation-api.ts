/**
 * Admin event-moderation API layer — wires the moderation screens to the real
 * backend (`/api/admin/events`). Maps the backend review lifecycle
 * (DRAFT/PENDING_REVIEW/APPROVED_WAITING_DEPOSIT/PUBLISHED/REJECTED) onto the
 * UI's ModerationStatus (pending/approved/rejected/waiting_deposit).
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
  waiting_deposit: "APPROVED_WAITING_DEPOSIT",
}

function toModerationStatus(reviewStatus: string): ModerationStatus {
  if (reviewStatus === "PUBLISHED") return "approved"
  if (reviewStatus === "REJECTED") return "rejected"
  if (reviewStatus === "APPROVED_WAITING_DEPOSIT") return "waiting_deposit"
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
  contract?: { repName?: string; signatureUrl?: string; agreed?: boolean; agreedToTerms?: boolean; serviceDepositAgreed?: boolean }
  logisticsServices?: string[]
  serviceCost?: number
  depositAmount?: number
  depositStatus?: string
  additionalCost?: number
  finalPaymentAmount?: number
  finalPaymentStatus?: string
}

interface ServerTicket {
  _id: string
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

/** List one moderation tab's events (pending / approved / rejected / waiting_deposit). */
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
    id: t._id,
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
    logisticsServices: e.logisticsServices ?? [],
    serviceCost: e.serviceCost ?? 0,
    depositAmount: e.depositAmount ?? 0,
    depositStatus: (e.depositStatus as "UNPAID" | "PAID") ?? "UNPAID",
    additionalCost: e.additionalCost ?? 0,
    finalPaymentAmount: e.finalPaymentAmount ?? 0,
    finalPaymentStatus: (e.finalPaymentStatus as "UNPAID" | "PAID") ?? "UNPAID",
    reviewStatus: e.reviewStatus,
    contract: e.contract ? {
      repName: e.contract.repName,
      signatureUrl: e.contract.signatureUrl,
      agreedToTerms: e.contract.agreed,
      serviceDepositAgreed: e.contract.agreed,
    } : undefined,
  }
}

/** PENDING_REVIEW → PUBLISHED (no services) or APPROVED_WAITING_DEPOSIT (with services). */
export async function approveEvent(id: string, serviceCost: number = 0): Promise<void> {
  await clientApi.post(`/admin/events/${id}/approve`, { serviceCost })
}

/** PENDING_REVIEW → REJECTED with a correction reason. */
export async function rejectEvent(id: string, reason: string): Promise<void> {
  await clientApi.post(`/admin/events/${id}/reject`, { reason })
}

/** Set additional cost for post-event settlement. */
export async function setAdditionalCost(id: string, additionalCost: number): Promise<void> {
  await clientApi.post(`/admin/events/${id}/additional-cost`, { additionalCost })
}
