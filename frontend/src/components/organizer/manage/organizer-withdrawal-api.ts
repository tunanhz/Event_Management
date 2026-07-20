/**
 * Withdrawal ("Rút tiền") API layer — real post-event payout requests:
 *   GET  /organizer/events/:id/withdrawals  — balance + request history
 *   POST /organizer/events/:id/withdrawals  — create a PENDING request
 * Balance is computed server-side (PAID revenue − PENDING/APPROVED requests);
 * the backend rejects requests while the event has not ended (SRS §2.3).
 */
import { clientApi } from "@/lib/client-api"

export type ServerWithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface ServerWithdrawal {
  _id: string
  amount: number
  bankName: string
  accountNumber: string
  accountHolder: string
  requestDate: string
  status: ServerWithdrawalStatus
  rejectionReason?: string
  note?: string
}

export interface WithdrawalOverview {
  totalRevenue: number
  heldOrPaidOut: number
  availableBalance: number
  eventEnded: boolean
  minWithdrawal: number
  history: ServerWithdrawal[]
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

export async function fetchWithdrawalOverview(eventId: string): Promise<WithdrawalOverview> {
  const res = await clientApi.get<Envelope<WithdrawalOverview>>(
    `/organizer/events/${eventId}/withdrawals`
  )
  return res.data
}

export interface CreateWithdrawalBody {
  amount: number
  bankName: string
  accountNumber: string
  accountHolder: string
  note?: string
}

/** Create a PENDING withdrawal request; throws with the backend message. */
export async function createWithdrawalRequest(
  eventId: string,
  body: CreateWithdrawalBody
): Promise<ServerWithdrawal> {
  const res = await clientApi.post<Envelope<ServerWithdrawal>>(
    `/organizer/events/${eventId}/withdrawals`,
    body
  )
  return res.data
}
