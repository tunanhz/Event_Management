import { clientApi } from "@/lib/client-api"

export type ReviewStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED_WAITING_DEPOSIT"
  | "PUBLISHED"
  | "REJECTED"
export type LifecycleStatus = "draft" | "published" | "cancelled" | "completed"

export interface PopulatedRef {
  _id?: string
  name?: string
  slug?: string
  fullName?: string
  email?: string
}

export interface AdminEvent {
  _id: string
  title: string
  description?: string
  location?: string
  organizer?: string
  category?: string
  categorySlug?: string
  categoryId?: PopulatedRef | string
  creatorId?: PopulatedRef | string
  status: LifecycleStatus
  reviewStatus: ReviewStatus
  startDate?: string
  endDate?: string
  date?: string
  capacity?: number
  maxAttendees?: number
  banner?: string
  imageUrl?: string
  posterImage?: string
  organizerLogoUrl?: string
  organizerDescription?: string
  isFeatured?: boolean
  isTrending?: boolean
  privacy?: "public" | "private"
  rejectionReason?: string
  reviewedAt?: string
  updatedAt: string
  createdAt: string
}

export interface AdminEventListParams {
  page?: number
  limit?: number
  search?: string
  status?: LifecycleStatus | ""
  reviewStatus?: ReviewStatus | ""
  categoryId?: string
  creatorId?: string
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: PaginationMeta
}

function withParams(path: string, params: AdminEventListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

export async function fetchAdminEvents(params: AdminEventListParams) {
  const res = await clientApi.get<ApiEnvelope<AdminEvent[]>>(withParams("/admin/events", params))
  return {
    events: res.data ?? [],
    meta: res.meta ?? { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: params.limit ?? 10 },
  }
}

export async function updateAdminEvent(id: string, payload: Partial<AdminEvent>) {
  const res = await clientApi.put<ApiEnvelope<AdminEvent>>(`/admin/events/${id}`, payload)
  return res.data
}

export async function forceAdminEventStatus(
  id: string,
  payload: { status?: LifecycleStatus; reviewStatus?: ReviewStatus; rejectionReason?: string; privacy?: "public" | "private" }
) {
  const res = await clientApi.patch<ApiEnvelope<AdminEvent>>(`/admin/events/${id}/status`, payload)
  return res.data
}

export async function cancelAdminEvent(id: string, reason?: string) {
  const res = await clientApi.post<ApiEnvelope<AdminEvent>>(`/admin/events/${id}/cancel`, { reason })
  return res.data
}

export async function deleteAdminEvent(id: string, force = true) {
  await clientApi.delete(`/admin/events/${id}?force=${force ? "true" : "false"}`)
}

export function refLabel(ref: PopulatedRef | string | undefined, key: "name" | "fullName" | "email") {
  return ref && typeof ref === "object" ? String(ref[key] ?? "") : ""
}
