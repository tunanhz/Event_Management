/**
 * Members ("Thành viên") API layer — real staff assignments from:
 *   GET /organizer/events/:id/members
 * Rows are StaffAssignment docs (created by ADMIN — see business.md §2.1)
 * joined with the staff user's profile; the organizer only reads them.
 */
import { clientApi } from "@/lib/client-api"

// Matches the unified staff-assignment model (develop): lowercase enum.
export type MemberStatus = "assigned" | "confirmed" | "completed" | "cancelled"

export interface EventMemberApi {
  id: string
  staffName: string
  staffEmail: string
  avatar?: string
  roleInEvent: string
  status: MemberStatus
  assignedAt: string
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  assigned: "Đã phân công",
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
}

/**
 * Statuses offered in the members filter dropdown. "cancelled" is left out on
 * purpose: the backend list query excludes cancelled assignments
 * (status: { $ne: 'cancelled' }), so a "Đã hủy" option would always show 0 and
 * read as "empty" rather than "not returned". The full label map above still
 * covers "cancelled" so the table renders it correctly if the API ever does.
 */
export const FILTERABLE_MEMBER_STATUSES: MemberStatus[] = ["assigned", "confirmed", "completed"]

export async function fetchEventMembers(eventId: string): Promise<EventMemberApi[]> {
  const res = await clientApi.get<Envelope<EventMemberApi[]>>(
    `/organizer/events/${eventId}/members`
  )
  return res.data ?? []
}
