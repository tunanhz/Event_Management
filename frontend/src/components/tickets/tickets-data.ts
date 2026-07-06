/**
 * Types, mock data and helpers for the "Vé của tôi" (My Tickets) page.
 *
 * Prices are stored as pre-formatted strings (matching the EventItem.price
 * convention) so there is no locale number-formatting difference between the
 * server and client render.
 */

export type TicketStatus = "upcoming" | "used" | "cancelled"

export interface UserTicket {
  id: string
  orderCode: string
  eventId: string
  eventTitle: string
  image: string
  date: string // DD/MM/YYYY
  time: string // HH:mm
  location: string
  ticketType: string
  quantity: number
  seat?: string
  totalPrice: string // pre-formatted, e.g. "1.600.000đ"
  purchasedAt: string // DD/MM/YYYY
  status: TicketStatus
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=400&fit=crop`

/** Demo tickets for the signed-in user, spread across the three statuses. */
export const myTickets: UserTicket[] = [
  {
    id: "tk-1",
    orderCode: "EVB-7K2H9X",
    eventId: "f3",
    eventTitle: "Liveshow Mỹ Tâm - Tri Ân",
    image: img("1493225457124-a3eb161ffa5f"),
    date: "12/07/2026",
    time: "19:30",
    location: "Sân vận động Phú Thọ, TP.HCM",
    ticketType: "Vé VIP",
    quantity: 2,
    seat: "Khu A · Ghế 12-13",
    totalPrice: "1.600.000đ",
    purchasedAt: "20/06/2026",
    status: "upcoming",
  },
  {
    id: "tk-2",
    orderCode: "EVB-3M8QP1",
    eventId: "e17",
    eventTitle: "Festival Sáng Tạo & Công Nghệ Việt Nam",
    image: img("1540575467063-178a50c2df87"),
    date: "05/07/2026",
    time: "09:00",
    location: "Trung tâm Hội nghị Quốc gia, Hà Nội",
    ticketType: "Vé Standard",
    quantity: 1,
    totalPrice: "300.000đ",
    purchasedAt: "18/06/2026",
    status: "upcoming",
  },
  {
    id: "tk-3",
    orderCode: "EVB-9F4TZK",
    eventId: "u1",
    eventTitle: "Đêm Nhạc Jazz Sài Gòn",
    image: img("1415201364774-f6f0bb35f28f"),
    date: "02/07/2026",
    time: "20:00",
    location: "Cargo Bar, Quận 7, TP.HCM",
    ticketType: "Vé Standard",
    quantity: 3,
    totalPrice: "750.000đ",
    purchasedAt: "15/06/2026",
    status: "upcoming",
  },
  {
    id: "tk-4",
    orderCode: "EVB-1A6WRX",
    eventId: "e5",
    eventTitle: "Đêm nhạc Đỗ Hoàng Hiệp - Hà Lê - Huy R",
    image: img("1514525253161-7a46d19cd819"),
    date: "20/05/2026",
    time: "20:00",
    location: "Nhà hát Bến Thành, TP.HCM",
    ticketType: "Vé VIP",
    quantity: 2,
    seat: "Khu B · Ghế 05-06",
    totalPrice: "700.000đ",
    purchasedAt: "02/05/2026",
    status: "used",
  },
  {
    id: "tk-5",
    orderCode: "EVB-5C2LDN",
    eventId: "e9",
    eventTitle: "Kịch IDECAF: Cậu Đồng",
    image: img("1507003211169-0a1dd7228f2d"),
    date: "10/04/2026",
    time: "19:30",
    location: "Sân khấu IDECAF, TP.HCM",
    ticketType: "Vé Standard",
    quantity: 1,
    totalPrice: "250.000đ",
    purchasedAt: "28/03/2026",
    status: "used",
  },
  {
    id: "tk-6",
    orderCode: "EVB-8H3VBM",
    eventId: "e22",
    eventTitle: "EDM Beach Party - Sunset Vibes",
    image: img("1514525253161-7a46d19cd819"),
    date: "30/06/2026",
    time: "16:00",
    location: "Bãi biển An Bàng, Hội An",
    ticketType: "Vé Standard",
    quantity: 2,
    totalPrice: "900.000đ",
    purchasedAt: "10/06/2026",
    status: "cancelled",
  },
]

/** Segmented-control tabs shown above the ticket list. */
export const ticketTabs: { key: TicketStatus; label: string }[] = [
  { key: "upcoming", label: "Sắp diễn ra" },
  { key: "used", label: "Đã sử dụng" },
  { key: "cancelled", label: "Đã hủy" },
]

type StatusTone = "success" | "muted" | "danger"

/** Label + colour tone per status (colour is never the only signal — the
 *  label text always accompanies it). */
export const ticketStatusMeta: Record<
  TicketStatus,
  { label: string; tone: StatusTone }
> = {
  upcoming: { label: "Sắp diễn ra", tone: "success" },
  used: { label: "Đã sử dụng", tone: "muted" },
  cancelled: { label: "Đã hủy", tone: "danger" },
}

/**
 * Deterministic pseudo-QR matrix for the demo e-ticket view.
 *
 * Seeded purely from the order code so the server and client produce the same
 * pattern (no hydration mismatch) and no Math.random is used. This is a
 * decorative placeholder, NOT a scannable QR code.
 */
export function buildQrMatrix(seed: string, size = 21): boolean[][] {
  // FNV-1a hash of the seed → xorshift PRNG state.
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const next = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967295
  }

  const m: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => next() > 0.5)
  )

  // Stamp 7×7 "finder" squares in three corners so it reads as a QR code.
  const stampFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        const onEdge = r === 0 || r === 6 || c === 0 || c === 6
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4
        m[r0 + r][c0 + c] = onEdge || inCore
      }
    }
  }
  stampFinder(0, 0)
  stampFinder(0, size - 7)
  stampFinder(size - 7, 0)

  return m
}
