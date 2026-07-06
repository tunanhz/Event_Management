/**
 * Mock data for the Admin finance console (SRS screens 32–33):
 * contract review after events complete + payout/refund execution.
 */

export type ContractReviewStatus = "awaiting_review" | "compliant" | "flagged"

export interface ContractReviewItem {
  id: string
  eventTitle: string
  organizer: string
  documentName: string
  uploadedAt: string // ISO
  status: ContractReviewStatus
  note?: string
}

export type PayoutKind = "payout" | "refund"
export type PayoutStatus = "pending" | "executed" | "rejected"

export interface PayoutRequest {
  id: string
  kind: PayoutKind
  eventTitle: string
  /** Organizer (payout) or participant (refund) receiving the money. */
  beneficiary: string
  bankInfo: string
  amount: number
  requestedAt: string // ISO
  status: PayoutStatus
  rejectionReason?: string
}

export const CONTRACT_STATUS_LABELS: Record<ContractReviewStatus, string> = {
  awaiting_review: "Chờ đối soát",
  compliant: "Đạt chuẩn",
  flagged: "Cần làm rõ",
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: "Chờ xử lý",
  executed: "Đã thực hiện",
  rejected: "Từ chối",
}

export const CONTRACT_REVIEWS_SEED: ContractReviewItem[] = [
  {
    id: "ctr-1",
    eventTitle: "Gala Cuối Năm Công nghệ 2025",
    organizer: "TechViet Media",
    documentName: "hop-dong-dich-vu-gala-2025.pdf",
    uploadedAt: "2025-12-16T10:00:00Z",
    status: "awaiting_review",
  },
  {
    id: "ctr-2",
    eventTitle: "Workshop Khởi nghiệp Sáng tạo 2026",
    organizer: "Startup Hub VN",
    documentName: "hop-dong-va-bien-ban-nghiem-thu.pdf",
    uploadedAt: "2026-07-13T09:30:00Z",
    status: "awaiting_review",
  },
  {
    id: "ctr-3",
    eventTitle: "Triển lãm Nhiếp ảnh Đường phố",
    organizer: "Urban Lens Collective",
    documentName: "bien-ban-thanh-ly-hop-dong.pdf",
    uploadedAt: "2026-06-29T15:20:00Z",
    status: "compliant",
    note: "Đã đối chiếu doanh thu và số vé bán — khớp số liệu.",
  },
  {
    id: "ctr-4",
    eventTitle: "Đêm nhạc Indie Hà Nội",
    organizer: "Melody Group",
    documentName: "hop-dong-thieu-phu-luc-2.pdf",
    uploadedAt: "2026-06-20T11:45:00Z",
    status: "flagged",
    note: "Thiếu phụ lục 2 (bảng kê thiết bị thuê) — đã yêu cầu bổ sung.",
  },
]

export const PAYOUT_REQUESTS_SEED: PayoutRequest[] = [
  {
    id: "pay-1",
    kind: "payout",
    eventTitle: "Gala Cuối Năm Công nghệ 2025",
    beneficiary: "TechViet Media",
    bankInfo: "Vietcombank · 0071000998877",
    amount: 393_760_000,
    requestedAt: "2026-06-28T08:10:00Z",
    status: "pending",
  },
  {
    id: "pay-2",
    kind: "payout",
    eventTitle: "Triển lãm Nhiếp ảnh Đường phố",
    beneficiary: "Urban Lens Collective",
    bankInfo: "Techcombank · 19031234567890",
    amount: 28_600_000,
    requestedAt: "2026-07-01T13:40:00Z",
    status: "pending",
  },
  {
    id: "pay-3",
    kind: "refund",
    eventTitle: "Đêm nhạc Indie Hà Nội (hủy)",
    beneficiary: "Nguyễn Minh Anh (người mua vé)",
    bankInfo: "MB Bank · 6868123456789",
    amount: 700_000,
    requestedAt: "2026-07-02T10:05:00Z",
    status: "pending",
  },
  {
    id: "pay-4",
    kind: "payout",
    eventTitle: "Lễ hội Ẩm thực Đường phố Đà Nẵng",
    beneficiary: "Da Nang Events",
    bankInfo: "BIDV · 21510000456789",
    amount: 145_000_000,
    requestedAt: "2026-06-22T16:00:00Z",
    status: "executed",
  },
]
