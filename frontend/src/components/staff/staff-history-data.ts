/**
 * Mock check-in log per event (mirrors the designed Checkin entity:
 * registrationId, checkInTime, status SUCCESS|FAILED|INVALID, note —
 * docs/business.md §6.5). Every scan is recorded with the staff member who
 * performed it, for gate accountability. Deterministic mock, no Date/random.
 */

export type CheckinLogStatus = "SUCCESS" | "FAILED" | "INVALID"

export interface CheckinLogEntry {
  id: string
  /** Scan time, display "HH:mm". */
  time: string
  /** Raw code that was scanned/typed. */
  code: string
  /** Matched attendee (absent when the code is unknown → INVALID). */
  attendeeName?: string
  ticketType?: string
  status: CheckinLogStatus
  /** Reason for FAILED/INVALID, or extra context. */
  note?: string
  /** Staff member who performed the scan. */
  staffName: string
}

export const LOG_STATUS_LABELS: Record<CheckinLogStatus, string> = {
  SUCCESS: "Thành công",
  FAILED: "Bị từ chối",
  INVALID: "Không hợp lệ",
}

/** Check-in log per event id, newest scan first. */
export const CHECKIN_HISTORY: Record<string, CheckinLogEntry[]> = {
  "evt-acoustic": [
    { id: "log-a08", time: "18:53", code: "EVB-3F7K-0210", attendeeName: "Lê Hoàng Cường", ticketType: "Thường", status: "FAILED", note: "Vé đã sử dụng lúc 18:51 — khách quét lại lần 2.", staffName: "Bạn" },
    { id: "log-a07", time: "18:51", code: "EVB-3F7K-0210", attendeeName: "Lê Hoàng Cường", ticketType: "Thường", status: "SUCCESS", staffName: "Bạn" },
    { id: "log-a06", time: "18:49", code: "EVB-3F7K-9999", status: "INVALID", note: "Mã không tồn tại trong sự kiện — nghi vấn vé giả, đã báo trưởng ca.", staffName: "Bạn" },
    { id: "log-a05", time: "18:45", code: "EVB-3F7K-0193", attendeeName: "Trần Thị Bình", ticketType: "VIP", status: "SUCCESS", staffName: "Bạn" },
    { id: "log-a04", time: "18:44", code: "EVB-9T2M-4401", status: "INVALID", note: "Vé thuộc sự kiện khác (Hội thảo Công nghệ).", staffName: "Minh Trí" },
    { id: "log-a03", time: "18:42", code: "EVB-3F7K-0192", attendeeName: "Nguyễn Văn An", ticketType: "VIP", status: "SUCCESS", staffName: "Bạn" },
    { id: "log-a02", time: "17:20", code: "EVB-3F7K-0250", attendeeName: "Bùi Quang Huy", ticketType: "VIP", status: "FAILED", note: "Ngoài khung giờ check-in (cổng mở 18:00).", staffName: "Minh Trí" },
    { id: "log-a01", time: "17:15", code: "EVB-3F7K-0212", attendeeName: "Vũ Minh Đức", ticketType: "Thường", status: "FAILED", note: "Ngoài khung giờ check-in (cổng mở 18:00).", staffName: "Bạn" },
  ],
  "evt-tech": [
    { id: "log-t02", time: "08:31", code: "EVB-9T2M-4401", attendeeName: "Hoàng Anh Khoa", ticketType: "Standard", status: "SUCCESS", staffName: "Bạn" },
    { id: "log-t01", time: "08:25", code: "EVB-9T2M-0000", status: "INVALID", note: "Mã không tồn tại — khách nhập nhầm, đã hướng dẫn tra cứu email.", staffName: "Bạn" },
  ],
  "evt-photo": [],
}

/** Log entries for one event (empty array when nothing recorded yet). */
export function getCheckinHistory(eventId: string): CheckinLogEntry[] {
  return CHECKIN_HISTORY[eventId] ?? []
}
