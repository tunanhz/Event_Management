/**
 * "Sự kiện của tôi" API layer — loads the organizer's real events from
 * `/api/organizer/events` and exposes the "gửi duyệt" (submit for review),
 * "đóng cọc" (pay deposit), and "thanh toán nốt" (pay remaining) actions.
 * Maps the backend review lifecycle onto the page's status tabs.
 */
import { clientApi } from "@/lib/client-api"
import { formatDateTime } from "@/lib/utils"
import type { OrganizerEvent, OrgEventStatus } from "./my-events-data"

export type ReviewStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED_WAITING_DEPOSIT" | "PUBLISHED" | "REJECTED"

interface ServerOrganizerEvent {
  _id: string
  title: string
  banner?: string
  imageUrl?: string
  posterImage?: string
  location?: string
  venue?: { name?: string }
  startDate?: string
  endDate?: string
  date?: string
  status?: string
  reviewStatus: ReviewStatus
  rejectionReason?: string
  serviceCost?: number
  depositAmount?: number
  depositStatus?: string
  additionalCost?: number
  finalPaymentAmount?: number
  finalPaymentStatus?: string
}

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=480&h=270&fit=crop"

/** Which status tab an event belongs to (drives the page's tab filter). */
export function bucketFor(
  reviewStatus: ReviewStatus,
  startISO?: string,
  endISO?: string,
  rawStatus?: string
): OrgEventStatus {
  if (reviewStatus === "PENDING_REVIEW") return "pending"
  if (reviewStatus === "APPROVED_WAITING_DEPOSIT") return "waiting_deposit"
  if (reviewStatus === "DRAFT" || reviewStatus === "REJECTED") return "draft"

  const now = Date.now()
  const start = startISO ? new Date(startISO).getTime() : NaN
  const end = endISO ? new Date(endISO).getTime() : start

  if (!Number.isNaN(start)) {
    if (!Number.isNaN(end) && end < now) return "past"
    if (start <= now && (Number.isNaN(end) || end >= now)) return "ongoing"
    if (start > now) return "upcoming"
  }
  return "upcoming"
}

function toDisplay(e: ServerOrganizerEvent): OrganizerEvent {
  const startISO = e.startDate || e.date
  return {
    id: e._id,
    title: e.title || "Sự kiện chưa đặt tên",
    image: e.banner || e.imageUrl || e.posterImage || PLACEHOLDER_IMG,
    dateTime: startISO ? formatDateTime(startISO) : "Chưa đặt lịch",
    venueName: e.venue?.name || e.location || "Chưa cập nhật",
    address: e.location || "Chưa cập nhật địa điểm",
    status: bucketFor(e.reviewStatus, startISO, e.endDate, e.status),
    reviewStatus: e.reviewStatus,
    rejectionReason: e.rejectionReason,
    serviceCost: e.serviceCost,
    depositAmount: e.depositAmount,
    depositStatus: (e.depositStatus as "UNPAID" | "PAID") ?? "UNPAID",
    additionalCost: e.additionalCost,
    finalPaymentAmount: e.finalPaymentAmount,
    finalPaymentStatus: (e.finalPaymentStatus as "UNPAID" | "PAID") ?? "UNPAID",
  }
}

/** All of the organizer's events (first 100), mapped to the page display shape.
 *  Used where the full list is needed at once (e.g. the reports page). The
 *  "Sự kiện của tôi" list itself paginates per-tab via {@link fetchMyEventsPage}. */
export async function fetchMyEvents(): Promise<OrganizerEvent[]> {
  const res = await clientApi.get<{ data: ServerOrganizerEvent[] }>(
    "/organizer/events?limit=100"
  )
  return (res.data ?? []).map(toDisplay)
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface MyEventsPageResult {
  events: OrganizerEvent[]
  pagination: PaginationMeta
}

/**
 * One page of the organizer's events for a given status tab, paginated
 * server-side. `bucket` is the tab id (upcoming/ongoing/past/pending/
 * waiting_deposit/draft) — the backend maps it to the matching reviewStatus
 * (and time window for PUBLISHED tabs). Optional `search` filters by title.
 */
export async function fetchMyEventsPage(
  bucket: OrgEventStatus,
  page: number,
  limit: number,
  search?: string
): Promise<MyEventsPageResult> {
  const params = new URLSearchParams({
    bucket,
    page: String(page),
    limit: String(limit),
  })
  const q = search?.trim()
  if (q) params.set("search", q)

  const res = await clientApi.get<{ data: ServerOrganizerEvent[]; meta?: PaginationMeta }>(
    `/organizer/events?${params.toString()}`
  )
  const events = (res.data ?? []).map(toDisplay)
  return {
    events,
    pagination:
      res.meta ?? { currentPage: page, totalPages: 1, totalItems: events.length, itemsPerPage: limit },
  }
}

/** DRAFT/REJECTED → PENDING_REVIEW. Throws with the backend message on failure. */
export async function submitForReview(id: string): Promise<void> {
  await clientApi.post(`/organizer/events/${id}/submit`, {})
}

/**
 * APPROVED_WAITING_DEPOSIT → PUBLISHED, via a real VNPAY payment: returns the
 * gateway redirect URL. The event only flips to PUBLISHED once VNPAY confirms
 * server-side (see /organizer/vnpay-return) — this call itself changes nothing.
 */
export async function payDeposit(id: string): Promise<string> {
  const res = await clientApi.post<{ data: { paymentUrl: string } }>(
    `/organizer/events/${id}/pay-deposit`,
    {}
  )
  return res.data.paymentUrl
}

/** Post-event / settlement via VNPAY: returns the gateway redirect URL. */
export async function payRemaining(id: string): Promise<string> {
  const res = await clientApi.post<{ data: { paymentUrl: string } }>(
    `/organizer/events/${id}/pay-remaining`,
    {}
  )
  return res.data.paymentUrl
}
