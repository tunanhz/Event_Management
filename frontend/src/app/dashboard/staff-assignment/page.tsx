import type { Metadata } from "next"
import { StaffAssignmentView } from "@/components/staff-assignment/StaffAssignmentView"

export const metadata: Metadata = {
  title: "Phân công staff | EventBox",
  description: "Gán nhân viên check-in vào sự kiện và chỉ định vai trò tại hiện trường.",
}

/** Admin staff assignment — /dashboard/staff-assignment. */
export default function StaffAssignmentPage() {
  return <StaffAssignmentView />
}
