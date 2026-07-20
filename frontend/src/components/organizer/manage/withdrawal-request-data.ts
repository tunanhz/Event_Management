/**
 * Mock data for the organizer "Withdrawal Request Form" (SRS screen 17).
 * Deterministic per event id — no backend endpoint yet.
 */

export type WithdrawalStatus = "pending" | "approved" | "rejected"

export interface WithdrawalRequest {
  id: string
  amount: number
  bank: string
  accountNumber: string
  accountHolder: string
  requestedAt: string // ISO (seed rows) or "vừa gửi" label handled by view
  status: WithdrawalStatus
  rejectionReason?: string
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã giải ngân",
  rejected: "Từ chối",
}

export const BANKS = [
  "Vietcombank",
  "Techcombank",
  "BIDV",
  "VietinBank",
  "MB Bank",
  "ACB",
  "Sacombank",
  "TPBank",
]

/** Minimum single withdrawal per platform policy (mock). */
export const MIN_WITHDRAWAL_VND = 500_000

/** Deterministic available balance for an event (mock revenue after fees). */
export function getAvailableBalance(eventId: string): number {
  const seed = Number(eventId.replace(/\D/g, "")) || 1
  return 12_500_000 + seed * 7_350_000
}

/** Seed history: earlier requests for events with an even seed. */
export function getWithdrawalHistory(eventId: string): WithdrawalRequest[] {
  const seed = Number(eventId.replace(/\D/g, "")) || 1
  if (seed % 2 !== 0) return []
  return [
    {
      id: `${eventId}-wd-1`,
      amount: 5_000_000,
      bank: "Vietcombank",
      accountNumber: "0071000123456",
      accountHolder: "CONG TY TNHH SU KIEN VIET",
      requestedAt: "2026-06-25T09:00:00Z",
      status: "approved",
    },
    {
      id: `${eventId}-wd-2`,
      amount: 12_000_000,
      bank: "Techcombank",
      accountNumber: "19035678901234",
      accountHolder: "CONG TY TNHH SU KIEN VIET",
      requestedAt: "2026-07-01T14:30:00Z",
      status: "pending",
    },
  ]
}
