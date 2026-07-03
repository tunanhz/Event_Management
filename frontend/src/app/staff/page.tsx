import type { Metadata } from "next"
import { StaffCheckInView } from "@/components/staff/StaffCheckInView"

export const metadata: Metadata = {
  title: "Soát vé & Check-in | EventBox",
  description: "Trạm soát vé cho nhân viên: quét mã vé và check-in người tham gia tại sự kiện.",
}

/** Staff check-in station — /staff. */
export default function StaffPage() {
  return <StaffCheckInView />
}
