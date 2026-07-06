/**
 * Mock data + helpers for the staff check-in area (/staff/**).
 *
 * Staff validate attendee tickets at the gate: each {@link StaffTicket} carries
 * an issued code and a `checkedInAt` marker (null until admitted). Kept
 * dependency-free and deterministic (no Date/random at module scope) so SSR and
 * CSR match — the admit timestamp is stamped client-side on interaction only.
 */

export interface StaffTicket {
  /** Ticket code printed on the QR / e-ticket, e.g. "EVB-3F7K-0192". */
  code: string
  attendeeName: string
  /** Buyer email, used by staff to look attendees up at the gate. */
  email: string
  /** Order the ticket belongs to (one order can hold several tickets). */
  orderCode: string
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
    dateTime: "19:30, Chủ nhật, 05 tháng 07 2026",
    venueName: "Nhà hát Hòa Bình",
    tickets: [
      { code: "EVB-3F7K-0192", attendeeName: "Nguyễn Văn An", email: "an.nguyenvan@example.com", orderCode: "DH-8801", ticketType: "VIP", checkedInAt: "18:42" },
      { code: "EVB-3F7K-0193", attendeeName: "Trần Thị Bình", email: "binh.tranthi@example.com", orderCode: "DH-8801", ticketType: "VIP", checkedInAt: "18:45" },
      { code: "EVB-3F7K-0210", attendeeName: "Lê Hoàng Cường", email: "cuong.lehoang@example.com", orderCode: "DH-8815", ticketType: "Thường", checkedInAt: "18:51" },
      { code: "EVB-3F7K-0211", attendeeName: "Phạm Thu Dung", email: "dung.phamthu@example.com", orderCode: "DH-8815", ticketType: "Thường", checkedInAt: null },
      { code: "EVB-3F7K-0212", attendeeName: "Vũ Minh Đức", email: "duc.vuminh@example.com", orderCode: "DH-8820", ticketType: "Thường", checkedInAt: null },
      { code: "EVB-3F7K-0213", attendeeName: "Đỗ Thị Én", email: "en.dothi@example.com", orderCode: "DH-8821", ticketType: "Thường", checkedInAt: null },
      { code: "EVB-3F7K-0250", attendeeName: "Bùi Quang Huy", email: "huy.buiquang@example.com", orderCode: "DH-8830", ticketType: "VIP", checkedInAt: null },
      { code: "EVB-3F7K-0251", attendeeName: "Ngô Thảo Linh", email: "linh.ngothao@example.com", orderCode: "DH-8830", ticketType: "Thường", checkedInAt: null },
    ],
  },
  {
    id: "evt-tech",
    title: "Hội thảo Công nghệ & Đổi mới Sáng tạo",
    dateTime: "09:00, Thứ 4, 05 tháng 08 2026",
    venueName: "GEM Center",
    tickets: [
      { code: "EVB-9T2M-4401", attendeeName: "Hoàng Anh Khoa", email: "khoa.hoanganh@example.com", orderCode: "DH-9102", ticketType: "Standard", checkedInAt: "08:31" },
      { code: "EVB-9T2M-4402", attendeeName: "Đặng Mỹ Lan", email: "lan.dangmy@example.com", orderCode: "DH-9102", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4403", attendeeName: "Trịnh Văn Nam", email: "nam.trinhvan@example.com", orderCode: "DH-9110", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4404", attendeeName: "Cao Thị Oanh", email: "oanh.caothi@example.com", orderCode: "DH-9111", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4405", attendeeName: "Lý Gia Phúc", email: "phuc.lygia@example.com", orderCode: "DH-9115", ticketType: "Standard", checkedInAt: null },
      { code: "EVB-9T2M-4406", attendeeName: "Mai Thanh Quý", email: "quy.maithanh@example.com", orderCode: "DH-9115", ticketType: "Standard", checkedInAt: null },
    ],
  },
  {
    id: "evt-photo",
    title: "Workshop Nhiếp ảnh Đường phố",
    dateTime: "14:00, Chủ nhật, 20 tháng 07 2026",
    venueName: "Studio A",
    tickets: [
      { code: "EVB-5W8P-7710", attendeeName: "Tô Hải Sơn", email: "son.tohai@example.com", orderCode: "DH-9301", ticketType: "Vé workshop", checkedInAt: null },
      { code: "EVB-5W8P-7711", attendeeName: "Hồ Bảo Trâm", email: "tram.hobao@example.com", orderCode: "DH-9302", ticketType: "Vé workshop", checkedInAt: null },
      { code: "EVB-5W8P-7712", attendeeName: "Dương Tuấn Việt", email: "viet.duongtuan@example.com", orderCode: "DH-9303", ticketType: "Vé workshop", checkedInAt: null },
      { code: "EVB-5W8P-7713", attendeeName: "Phan Khánh Vy", email: "vy.phankhanh@example.com", orderCode: "DH-9303", ticketType: "Vé workshop", checkedInAt: null },
    ],
  },
]

/** Find an assigned event by its id, or undefined when not assigned. */
export function getStaffEventById(id: string): StaffEvent | undefined {
  return STAFF_EVENTS.find((e) => e.id === id)
}

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

/**
 * Current wall-clock time as "HH:mm". Only call from event handlers (never
 * during render) so SSR/CSR markup stays deterministic.
 */
export function nowHHmm(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
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
