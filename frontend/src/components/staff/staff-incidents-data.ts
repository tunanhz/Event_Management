/**
 * Mock incident reports raised by gate staff (business rule: staff can report
 * incidents at the gate — docs/business.md, actor Staff). Deterministic mock;
 * new reports created in the UI are stamped client-side on interaction only.
 */

export const INCIDENT_TYPES = [
  { value: "fake-ticket", label: "Nghi vấn vé giả" },
  { value: "duplicate-ticket", label: "Vé trùng / đã sử dụng" },
  { value: "device-error", label: "Lỗi thiết bị quét / hệ thống" },
  { value: "gate-issue", label: "Sự cố tại cổng (an ninh, ùn tắc…)" },
  { value: "other", label: "Sự cố khác" },
] as const

export type IncidentTypeValue = (typeof INCIDENT_TYPES)[number]["value"]

export type IncidentStatus = "PENDING" | "IN_REVIEW" | "RESOLVED"

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  PENDING: "Chờ xử lý",
  IN_REVIEW: "Đang xem xét",
  RESOLVED: "Đã xử lý",
}

export interface StaffIncident {
  id: string
  /** References StaffEvent.id in staff-checkin-data.ts. */
  eventId: string
  type: IncidentTypeValue
  /** Ticket code involved, if any. */
  ticketCode?: string
  description: string
  /** Display time the report was created, e.g. "18:49 · 05/07". */
  createdAt: string
  status: IncidentStatus
}

/** Reports already filed by the signed-in staff member, newest first. */
export const STAFF_INCIDENTS: StaffIncident[] = [
  {
    id: "inc-002",
    eventId: "evt-acoustic",
    type: "fake-ticket",
    ticketCode: "EVB-3F7K-9999",
    description:
      "Khách xuất trình vé in giấy có mã không tồn tại trong hệ thống. Đã giữ vé và mời khách sang quầy hỗ trợ.",
    createdAt: "18:49 · 05/07",
    status: "IN_REVIEW",
  },
  {
    id: "inc-001",
    eventId: "evt-acoustic",
    type: "device-error",
    description:
      "Máy quét ở cổng A mất kết nối khoảng 5 phút, phải nhập mã thủ công trong thời gian đó.",
    createdAt: "18:10 · 05/07",
    status: "RESOLVED",
  },
]

/** Label for an incident type value (falls back to the raw value). */
export function incidentTypeLabel(value: IncidentTypeValue): string {
  return INCIDENT_TYPES.find((t) => t.value === value)?.label ?? value
}
