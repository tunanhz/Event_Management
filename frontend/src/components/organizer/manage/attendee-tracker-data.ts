/**
 * Mock attendee list per organizer event ("Attendee Tracker" — SRS screen 15).
 * Deterministic data only (no Date/random at module scope) for SSR safety.
 */

export type AttendeeStatus = "checked_in" | "registered" | "cancelled"

export interface EventAttendee {
  id: string
  orderCode: string
  name: string
  email: string
  phone: string
  ticketType: string
  quantity: number
  purchasedAt: string // ISO
  status: AttendeeStatus
  checkedInAt?: string // "HH:mm" when status is checked_in
}

export const ATTENDEE_STATUS_LABELS: Record<AttendeeStatus, string> = {
  checked_in: "Đã check-in",
  registered: "Chưa vào",
  cancelled: "Đã hủy",
}

/** Shared attendee pool; each event slices a deterministic window of it. */
const POOL: Omit<EventAttendee, "id" | "orderCode">[] = [
  { name: "Nguyễn Minh Anh", email: "minhanh.nguyen@gmail.com", phone: "0901 234 567", ticketType: "VIP", quantity: 2, purchasedAt: "2026-06-20T09:15:00Z", status: "checked_in", checkedInAt: "18:05" },
  { name: "Trần Quốc Bảo", email: "baotran92@gmail.com", phone: "0912 345 678", ticketType: "Standard", quantity: 1, purchasedAt: "2026-06-21T14:02:00Z", status: "checked_in", checkedInAt: "18:12" },
  { name: "Lê Thu Hà", email: "ha.le@outlook.com", phone: "0987 654 321", ticketType: "Standard", quantity: 3, purchasedAt: "2026-06-22T10:40:00Z", status: "registered" },
  { name: "Phạm Đức Huy", email: "huypham.dev@gmail.com", phone: "0934 567 890", ticketType: "VIP", quantity: 1, purchasedAt: "2026-06-23T08:25:00Z", status: "registered" },
  { name: "Võ Thị Kim Chi", email: "kimchi.vo@yahoo.com", phone: "0945 678 901", ticketType: "Standard", quantity: 2, purchasedAt: "2026-06-23T19:55:00Z", status: "checked_in", checkedInAt: "18:31" },
  { name: "Đỗ Nhật Long", email: "longdo.event@gmail.com", phone: "0956 789 012", ticketType: "SVIP", quantity: 1, purchasedAt: "2026-06-24T11:10:00Z", status: "registered" },
  { name: "Hoàng Mai Phương", email: "phuong.hoang@company.vn", phone: "0967 890 123", ticketType: "Standard", quantity: 4, purchasedAt: "2026-06-25T16:45:00Z", status: "cancelled" },
  { name: "Bùi Anh Tuấn", email: "tuanbui.music@gmail.com", phone: "0978 901 234", ticketType: "VIP", quantity: 2, purchasedAt: "2026-06-26T09:05:00Z", status: "registered" },
  { name: "Ngô Thanh Vân", email: "van.ngo@studio.vn", phone: "0989 012 345", ticketType: "SVIP", quantity: 1, purchasedAt: "2026-06-26T21:30:00Z", status: "checked_in", checkedInAt: "19:02" },
  { name: "Đặng Gia Hân", email: "giahan.dang@gmail.com", phone: "0990 123 456", ticketType: "Standard", quantity: 2, purchasedAt: "2026-06-27T13:20:00Z", status: "registered" },
  { name: "Lý Hoàng Nam", email: "nam.ly@techcorp.vn", phone: "0901 987 654", ticketType: "Standard", quantity: 1, purchasedAt: "2026-06-28T07:50:00Z", status: "cancelled" },
  { name: "Trịnh Bảo Ngọc", email: "ngoc.trinh@gmail.com", phone: "0913 876 543", ticketType: "VIP", quantity: 3, purchasedAt: "2026-06-29T18:15:00Z", status: "registered" },
  { name: "Phan Việt Dũng", email: "dungphan.vn@gmail.com", phone: "0924 765 432", ticketType: "Standard", quantity: 1, purchasedAt: "2026-06-30T10:00:00Z", status: "checked_in", checkedInAt: "19:20" },
  { name: "Vũ Hải Yến", email: "yenvu.hn@outlook.com", phone: "0935 654 321", ticketType: "Standard", quantity: 2, purchasedAt: "2026-07-01T15:35:00Z", status: "registered" },
]

/**
 * Deterministic per-event list: rotate the pool by the numeric suffix of the
 * event id so each event shows a different-but-stable roster.
 */
export function getAttendeesByEventId(eventId: string): EventAttendee[] {
  const seed = Number(eventId.replace(/\D/g, "")) || 1
  const offset = seed % POOL.length
  const rotated = [...POOL.slice(offset), ...POOL.slice(0, offset)]
  const count = 8 + (seed % (POOL.length - 7)) // 8..14 rows per event
  return rotated.slice(0, count).map((a, i) => ({
    ...a,
    id: `${eventId}-att-${i + 1}`,
    orderCode: `EV${String(seed).padStart(2, "0")}${String(i + 1).padStart(3, "0")}${a.name.charAt(0).toUpperCase()}`,
  }))
}

export function summarizeAttendees(list: EventAttendee[]) {
  const checkedIn = list.filter((a) => a.status === "checked_in")
  const cancelled = list.filter((a) => a.status === "cancelled")
  const tickets = list.filter((a) => a.status !== "cancelled").reduce((sum, a) => sum + a.quantity, 0)
  return {
    total: list.length,
    tickets,
    checkedIn: checkedIn.length,
    cancelled: cancelled.length,
  }
}

/** Build a UTF-8 CSV (with BOM so Excel reads Vietnamese correctly). */
export function attendeesToCsv(list: EventAttendee[]): string {
  const header = ["Mã đơn", "Họ tên", "Email", "Điện thoại", "Loại vé", "Số vé", "Ngày mua", "Trạng thái", "Giờ check-in"]
  const rows = list.map((a) => [
    a.orderCode,
    a.name,
    a.email,
    a.phone,
    a.ticketType,
    String(a.quantity),
    new Date(a.purchasedAt).toLocaleString("vi-VN"),
    ATTENDEE_STATUS_LABELS[a.status],
    a.checkedInAt ?? "",
  ])
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  return "﻿" + [header, ...rows].map((r) => r.map(escape).join(",")).join("\n")
}
