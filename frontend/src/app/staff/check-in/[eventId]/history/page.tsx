import type { Metadata } from "next"
import { StaffCheckInHistoryView } from "@/components/staff/StaffCheckInHistoryView"

export const metadata: Metadata = {
  title: "Lịch sử check-in | EventBox",
  description: "Nhật ký các lượt quét vé tại cổng: kết quả, ghi chú và nhân viên thực hiện.",
}

/** Gate scan log — /staff/check-in/[eventId]/history. */
export default async function StaffCheckInHistoryPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  return <StaffCheckInHistoryView key={eventId} eventId={eventId} />
}
