/**
 * Mock data + helpers for the staff check-in station (/staff).
 *
 * Staff validate attendee tickets at the gate: each {@link StaffTicket} carries
 * an issued code and a `checkedInAt` marker (null until admitted). Kept
 * dependency-free and deterministic (no Date/random) so SSR and CSR match — the
 * admit timestamp is stamped client-side on interaction only.
 */

export interface StaffTicket {
  /** Ticket code printed on the QR / e-ticket, e.g. "EVB-3F7K-0192". */
  code: string
  attendeeName: string
  ticketType: string
  /** Display time it was admitted ("HH:mm"), or null if not yet checked in. */
  checkedInAt: string | null
}

export interface StaffEvent {
  id: string
  title: string
  dateTime: string
  venueName: string
  tickets: StaffTicket[]
}

/** Events the signed-in staff member is assigned to work. */
export const STAFF_EVENTS: StaffEvent[] = [
  {
    id: "evt-acoustic",
    title: "Đêm nhạc Acoustic Mùa Thu",
    dateTime: "19:30, Thứ 7, 18 tháng 07 2026",
    venueName: "Nhà hát Hòa Bình",
    tickets: [
      { code: "EVB-3F7K-0192", attendeeName: "Nguyễn Văn An", ticketType: "VIP", checkedInAt: "18:42" },
      { code: "EVB-3F7K-0193", attendeeName: "Trần Thị Bình", ticketType: "VIP", checkedInAt: "18:45" },
      { code: "EVB-3F7K-0210", attendeeName: "Lê Hoàng Cường", ticketType: "Thường", checkedInAt: "18:51" },
      { code: "EVB-3F7K-0211", attendeeName: "Phạm Thu Dung", ticketType: "Thường", checkedInAt: null },
      { code: "EVB-3F7K-0212", attendeeName: "Vũ Minh Đức", ticketType: "Thường", checkedInAt: null },
      { code: "EVB-3F7K-0213", attendeeName: "Đỗ Thị Én", ticketType: "Thường", checkedInAt: null },
      { code: "EVB-3F7K-0250", attendeeName: "Bùi Quang Huy", ticketType: "VIP", checkedInAt: null },
      { code: "EVB-3F7K-0251", attendeeName: "Ngô Thảo Linh", ticketType: "Thường", checkedInAt: null },
    ],
  },
  {
    id: "evt-tech",
    title: "Hội thảo Công nghệ & Đổi mới Sáng tạo",
    dateTime: "09:00, Thứ 4, 05 tháng 08 2026",
    venueName: "GEM Center",
    tickets: [
      { code: "EVB-9T2M-4401", attendeeName: "Hoàng Anh Khoa", ticketType: "Standard", checkedInAt: "08:31" },
      { code: "EVB-9T2M-4402", attendeeName: "Đặng Mỹ Lan", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4403", attendeeName: "Trịnh Văn Nam", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4404", attendeeName: "Cao Thị Oanh", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4405", attendeeName: "Lý Gia Phúc", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4406", attendeeName: "Mai Thanh Quý", ticketType: "Standard", checkedInAt: null },
    ],
  },
  {
    id: "evt-photo",
    title: "Workshop Nhiếp ảnh Đường phố",
    dateTime: "14:00, Chủ nhật, 20 tháng 07 2026",
    venueName: "Studio A",
    tickets: [
      { code: "EVB-5W8P-7710", attendeeName: "Tô Hải Sơn", ticketType: "Vé workshop", checkedInAt: null },
      { code: "EVB-5W8P-7711", attendeeName: "Hồ Bảo Trâm", ticketType: "Vé workshop", checkedInAt: null },
      { code: "EVB-5W8P-7712", attendeeName: "Dương Tuấn Việt", ticketType: "Vé workshop", checkedInAt: null },
      { code: "EVB-5W8P-7713", attendeeName: "Phan Khánh Vy", ticketType: "Vé workshop", checkedInAt: null },
    ],
  },
]

export type CheckInStatus = "success" | "duplicate" | "invalid"

export interface CheckInResult {
  status: CheckInStatus
  /** The matched ticket for success/duplicate; absent for invalid. */
  ticket?: StaffTicket
  /** For a duplicate, the time it was originally admitted. */
  previousTime?: string
}

/** Normalize scanner input: trim, collapse spaces, uppercase. */
export function normalizeCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase()
}

/** Aggregate check-in counters for a ticket list. */
export function summarizeTickets(tickets: StaffTicket[]) {
  const total = tickets.length
  const checkedIn = tickets.filter((t) => t.checkedInAt).length
  return {
    total,
    checkedIn,
    remaining: total - checkedIn,
    percent: total ? Math.round((checkedIn / total) * 100) : 0,
  }
}

/** Per-ticket-type check-in breakdown (checked-in / total). */
export function breakdownByType(tickets: StaffTicket[]) {
  const map = new Map<string, { type: string; total: number; checkedIn: number }>()
  for (const t of tickets) {
    const row = map.get(t.ticketType) ?? { type: t.ticketType, total: 0, checkedIn: 0 }
    row.total += 1
    if (t.checkedInAt) row.checkedIn += 1
    map.set(t.ticketType, row)
  }
  return Array.from(map.values())
}
