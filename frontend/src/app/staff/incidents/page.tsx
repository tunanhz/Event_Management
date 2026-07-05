import type { Metadata } from "next"
import { StaffIncidentsView } from "@/components/staff/StaffIncidentsView"

export const metadata: Metadata = {
  title: "Báo cáo sự cố | EventBox",
  description: "Nhân viên soát vé báo cáo sự cố tại cổng và theo dõi trạng thái xử lý.",
}

/** Gate incident reporting — /staff/incidents. */
export default function StaffIncidentsPage() {
  return <StaffIncidentsView />
}
