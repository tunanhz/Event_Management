import { clientApi } from "@/lib/client-api"

export type ReviewStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "REJECTED"
export type LifecycleStatus = "draft" | "published" | "cancelled" | "completed"

export interface EventStatusSummary {
  total: number
  draft: number
  pendingReview: number
  published: number
  rejected: number
  cancelled: number
  completed: number
}

interface PopulatedRef {
  _id?: string
  name?: string
  slug?: string
  fullName?: string
  email?: string
}

export interface EventStatusItem {
  _id: string
  title: string
  organizer?: string
  reviewStatus: ReviewStatus
  status: LifecycleStatus
  updatedAt: string
  createdAt: string
  reviewedAt?: string
  rejectionReason?: string
  categoryId?: PopulatedRef | string
  creatorId?: PopulatedRef | string
}

export interface EventStatusTracking {
  summary: EventStatusSummary
  events: EventStatusItem[]
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

export async function fetchEventStatusTracking(search = ""): Promise<EventStatusTracking> {
  const query = search.trim()
  const path = query
    ? `/admin/events/status-tracking?search=${encodeURIComponent(query)}`
    : "/admin/events/status-tracking"
  const res = await clientApi.get<ApiEnvelope<EventStatusTracking>>(path)
  return res.data
}

export function refText(ref: PopulatedRef | string | undefined, key: keyof PopulatedRef): string {
  return ref && typeof ref === "object" ? String(ref[key] ?? "") : ""
}
