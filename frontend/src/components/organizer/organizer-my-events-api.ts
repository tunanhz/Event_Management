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
export function bucketFor(reviewStatus: ReviewStatus, startISO?: string): OrgEventStatus {
  if (reviewStatus === "PENDING_REVIEW") return "pending"
  if (reviewStatus === "APPROVED_WAITING_DEPOSIT") return "waiting_deposit"
  // DRAFT and REJECTED both live in "Nháp" — rejected ones are editable/resubmittable.
  if (reviewStatus === "DRAFT" || reviewStatus === "REJECTED") return "draft"
  // PUBLISHED → upcoming vs past by start date.
  const start = startISO ? new Date(startISO).getTime() : NaN
  return !Number.isNaN(start) && start >= Date.now() ? "upcoming" : "past"
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
    status: bucketFor(e.reviewStatus, startISO),
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

/** All of the organizer's events, mapped to the page display shape. */
export async function fetchMyEvents(): Promise<OrganizerEvent[]> {
  const res = await clientApi.get<{ data: ServerOrganizerEvent[] }>(
    "/organizer/events?limit=100"
  )
  return (res.data ?? []).map(toDisplay)
}

/** DRAFT/REJECTED → PENDING_REVIEW. Throws with the backend message on failure. */
export async function submitForReview(id: string): Promise<void> {
  await clientApi.post(`/organizer/events/${id}/submit`, {})
}

/** APPROVED_WAITING_DEPOSIT → PUBLISHED: organizer pays the 20% deposit. */
export async function payDeposit(id: string): Promise<void> {
  await clientApi.post(`/organizer/events/${id}/pay-deposit`, {})
}

/** Post-event: organizer pays the remaining 80% + additional costs. */
export async function payRemaining(id: string): Promise<void> {
  await clientApi.post(`/organizer/events/${id}/pay-remaining`, {})
}
