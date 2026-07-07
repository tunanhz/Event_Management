import { clientApi } from "@/lib/client-api"

export type TicketStatus = "ACTIVE" | "SOLD_OUT" | "HIDDEN"

interface PopulatedEvent {
  _id?: string
  title?: string
  status?: string
  reviewStatus?: string
  startDate?: string
  date?: string
  location?: string
  category?: string
  organizer?: string
}

export interface AdminTicket {
  _id: string
  eventId: string | PopulatedEvent
  showId?: string
  ticketName: string
  description?: string
  price: number
  quantity: number
  soldQuantity: number
  minPerOrder: number
  maxPerOrder: number
  image?: string
  saleStart?: string
  saleEnd?: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

export interface AdminTicketListParams {
  page?: number
  limit?: number
  eventId?: string
  status?: TicketStatus | ""
  search?: string
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

function withParams(path: string, params: AdminTicketListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

export async function fetchAdminTickets(params: AdminTicketListParams) {
  const res = await clientApi.get<ApiEnvelope<AdminTicket[]>>(withParams("/admin/tickets", params))
  return {
    tickets: res.data ?? [],
    meta: res.meta ?? { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: params.limit ?? 10 },
  }
}

export async function updateAdminTicket(id: string, payload: Partial<AdminTicket>) {
  const res = await clientApi.put<ApiEnvelope<AdminTicket>>(`/admin/tickets/${id}`, payload)
  return res.data
}

export async function updateAdminTicketStatus(id: string, status: TicketStatus) {
  const res = await clientApi.patch<ApiEnvelope<AdminTicket>>(`/admin/tickets/${id}/status`, { status })
  return res.data
}

export async function deleteAdminTicket(id: string) {
  await clientApi.delete(`/admin/tickets/${id}`)
}

export function eventRef(ticket: AdminTicket): PopulatedEvent {
  return typeof ticket.eventId === "object" ? ticket.eventId : {}
}
