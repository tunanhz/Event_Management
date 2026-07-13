/**
 * Booking + my-tickets data layer (client). Wires the participant flow to the
 * real registration API: hold → confirm (mock payment) → list "Vé của tôi".
 */
import { clientApi } from "@/lib/client-api"
import type { TicketStatus, UserTicket } from "@/components/tickets/tickets-data"

interface PopulatedRef {
  _id?: string
  title?: string
  imageUrl?: string
  banner?: string
  date?: string
  time?: string
  location?: string
  startDate?: string
  ticketName?: string
}

interface ApiRegistration {
  _id: string
  eventId: string | PopulatedRef
  ticketId: string | PopulatedRef
  quantity: number
  totalAmount: number
  status: "PENDING" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED"
  createdAt: string
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

/** POST /registrations — reserve `quantity` of one ticket tier (10-min hold). */
export async function createRegistration(
  eventId: string,
  ticketId: string,
  quantity: number
): Promise<ApiRegistration> {
  const res = await clientApi.post<ApiEnvelope<ApiRegistration>>("/registrations", {
    eventId,
    ticketId,
    quantity,
  })
  return res.data
}

/** POST /registrations/:id/confirm-payment — mock payment confirmation. */
export async function confirmPayment(registrationId: string): Promise<void> {
  await clientApi.post(`/registrations/${registrationId}/confirm-payment`, {})
}

/**
 * Hold a whole selection: one registration per selected tier. Returns the
 * created registration ids (each PENDING, 10-min hold) without paying yet —
 * the caller decides how to pay next (mock confirm, or redirect to VNPAY).
 * Any tier that fails (e.g. sold out) rejects the whole call with the
 * backend message.
 */
export async function holdSelection(
  eventId: string,
  lines: { ticketId: string; quantity: number }[]
): Promise<string[]> {
  const ids: string[] = []
  for (const line of lines) {
    if (line.quantity <= 0) continue
    const reg = await createRegistration(eventId, line.ticketId, line.quantity)
    ids.push(reg._id)
  }
  return ids
}

/** Confirms a mock payment method for every held registration in the selection. */
export async function confirmMockPayments(registrationIds: string[]): Promise<void> {
  for (const id of registrationIds) {
    await confirmPayment(id)
  }
}

/** POST /payments/vnpay/create-payment-url — returns the VNPAY redirect URL. */
export async function createVnpayPaymentUrl(registrationIds: string[]): Promise<string> {
  const res = await clientApi.post<ApiEnvelope<{ paymentUrl: string }>>(
    "/payments/vnpay/create-payment-url",
    { registrationIds }
  )
  return res.data.paymentUrl
}

const ref = (v: string | PopulatedRef | undefined): PopulatedRef =>
  v && typeof v === "object" ? v : {}

function formatDate(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

/** Map a populated registration to the "Vé của tôi" card shape. */
function toUserTicket(r: ApiRegistration): UserTicket {
  const ev = ref(r.eventId)
  const tk = ref(r.ticketId)
  const startISO = ev.startDate || ev.date
  const eventPassed = startISO ? new Date(startISO).getTime() < Date.now() : false
  let status: TicketStatus = "upcoming"
  if (r.status === "CANCELLED" || r.status === "EXPIRED" || r.status === "REFUNDED") status = "cancelled"
  else if (r.status === "PAID" && eventPassed) status = "used"
  return {
    id: r._id,
    orderCode: `EVB-${r._id.slice(-6).toUpperCase()}`,
    eventId: ev._id || (typeof r.eventId === "string" ? r.eventId : ""),
    eventTitle: ev.title || "Sự kiện",
    image: ev.imageUrl || ev.banner || "",
    date: formatDate(startISO),
    time: ev.time || "",
    location: ev.location || "",
    ticketType: tk.ticketName || "Vé",
    quantity: r.quantity,
    totalPrice: `${(r.totalAmount ?? 0).toLocaleString("vi-VN")}đ`,
    purchasedAt: formatDate(r.createdAt),
    status,
  }
}

/** GET /registrations/me — the signed-in participant's tickets, mapped. */
export async function fetchMyTickets(): Promise<UserTicket[]> {
  const res = await clientApi.get<ApiEnvelope<ApiRegistration[]>>("/registrations/me?limit=100")
  return (res.data ?? []).map(toUserTicket)
}
