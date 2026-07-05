import type { Metadata } from "next"
import { StaffAssignedEventsView } from "@/components/staff/StaffAssignedEventsView"

export const metadata: Metadata = {
  title: "Sự kiện được phân công | EventBox",
  description: "Danh sách sự kiện nhân viên soát vé được phân công làm việc.",
}

/** Staff landing — assigned events with shortcuts into each check-in station. */
export default function StaffPage() {
  return <StaffAssignedEventsView />
}
