import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStaffEventById } from "@/components/staff/staff-checkin-data"
import { StaffCheckInView } from "@/components/staff/StaffCheckInView"

export const metadata: Metadata = {
  title: "Trạm check-in | EventBox",
  description: "Trạm soát vé cho nhân viên: quét mã vé và check-in người tham gia tại sự kiện.",
}

/** Check-in station for one assigned event — /staff/check-in/[eventId]. */
export default async function StaffCheckInPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = getStaffEventById(eventId)
  if (!event) notFound()

  return <StaffCheckInView key={event.id} event={event} />
}
