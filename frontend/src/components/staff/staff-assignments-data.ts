/**
 * Mock staff↔event assignments (mirrors the designed StaffAssignment entity:
 * eventId + staffId + responsibility — docs/business.md §6.7). Deterministic,
 * no Date/random, so SSR and CSR render identically.
 */

export type AssignmentTiming = "today" | "upcoming"

export interface StaffAssignment {
  /** References StaffEvent.id in staff-checkin-data.ts. */
  eventId: string
  /** Duty assigned by the organizer, e.g. "Soát vé cổng chính". */
  responsibility: string
  /** Gate / station the staff member works at. */
  gate: string
  /** Working shift window, display string. */
  shift: string
  /** Relative timing used for the status badge on the assignment card. */
  timing: AssignmentTiming
}

export const TIMING_LABELS: Record<AssignmentTiming, string> = {
  today: "Hôm nay",
  upcoming: "Sắp diễn ra",
}

/** Assignments of the signed-in staff member, soonest first. */
export const STAFF_ASSIGNMENTS: StaffAssignment[] = [
  {
    eventId: "evt-acoustic",
    responsibility: "Soát vé & hỗ trợ khách VIP",
    gate: "Cổng chính (A)",
    shift: "18:00 – 22:00",
    timing: "today",
  },
  {
    eventId: "evt-photo",
    responsibility: "Soát vé & điểm danh học viên",
    gate: "Sảnh Studio A",
    shift: "13:00 – 17:30",
    timing: "upcoming",
  },
  {
    eventId: "evt-tech",
    responsibility: "Soát vé khu hội thảo",
    gate: "Cổng B2",
    shift: "07:30 – 12:00",
    timing: "upcoming",
  },
]

/** Assignment details for one event, or undefined if not assigned. */
export function getAssignmentByEventId(eventId: string): StaffAssignment | undefined {
  return STAFF_ASSIGNMENTS.find((a) => a.eventId === eventId)
}
