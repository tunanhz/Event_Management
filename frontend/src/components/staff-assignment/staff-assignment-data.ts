/**
 * Mock data for the Admin "Event staff assignment" grid (SRS screen 26).
 * Mirrors the designed StaffAssignment entity (eventId, staffId, roleInEvent).
 */

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
}

export interface StaffAssignmentEntry {
  staffId: string
  roleInEvent: string
}

export const ROLES_IN_EVENT = [
  "Soát vé cổng chính",
  "Soát vé cổng phụ",
  "Hỗ trợ khán giả",
  "Điều phối khu vực",
]

export const STAFF_MEMBERS: StaffMember[] = [
  { id: "stf-1", name: "Nguyễn Văn Kiên", email: "kien.nguyen@eventbox.vn", phone: "0901 111 222" },
  { id: "stf-2", name: "Trần Thị Mai", email: "mai.tran@eventbox.vn", phone: "0902 222 333" },
  { id: "stf-3", name: "Lê Hoàng Phúc", email: "phuc.le@eventbox.vn", phone: "0903 333 444" },
  { id: "stf-4", name: "Phạm Thu Trang", email: "trang.pham@eventbox.vn", phone: "0904 444 555" },
  { id: "stf-5", name: "Đỗ Minh Quân", email: "quan.do@eventbox.vn", phone: "0905 555 666" },
  { id: "stf-6", name: "Vũ Ngọc Ánh", email: "anh.vu@eventbox.vn", phone: "0906 666 777" },
  { id: "stf-7", name: "Hoàng Đức Thịnh", email: "thinh.hoang@eventbox.vn", phone: "0907 777 888" },
  { id: "stf-8", name: "Bùi Khánh Linh", email: "linh.bui@eventbox.vn", phone: "0908 888 999" },
]

/** Seed assignments keyed by event id (see lib/mock-data.ts mockEvents). */
export const SEED_ASSIGNMENTS: Record<string, StaffAssignmentEntry[]> = {
  "evt-1": [
    { staffId: "stf-1", roleInEvent: "Soát vé cổng chính" },
    { staffId: "stf-2", roleInEvent: "Soát vé cổng phụ" },
    { staffId: "stf-5", roleInEvent: "Điều phối khu vực" },
  ],
  "evt-2": [
    { staffId: "stf-3", roleInEvent: "Soát vé cổng chính" },
    { staffId: "stf-4", roleInEvent: "Hỗ trợ khán giả" },
  ],
  "evt-4": [{ staffId: "stf-6", roleInEvent: "Soát vé cổng chính" }],
}
