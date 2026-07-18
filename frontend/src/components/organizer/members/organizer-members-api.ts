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

export async function fetchEventMembers(eventId: string): Promise<EventMemberApi[]> {
  const res = await clientApi.get<Envelope<EventMemberApi[]>>(
    `/organizer/events/${eventId}/members`
  )
  return res.data ?? []
}
