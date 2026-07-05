import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getStaffEventById } from "@/components/staff/staff-checkin-data"
import { StaffShiftSummaryView } from "@/components/staff/StaffShiftSummaryView"

export const metadata: Metadata = {
  title: "Ca trực của tôi | EventBox",
  description: "Tổng kết ca trực soát vé: kết quả quét, phân công và ghi chú bàn giao.",
}

/** Personal shift recap for handover — /staff/check-in/[eventId]/summary. */
export default async function StaffShiftSummaryPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = getStaffEventById(eventId)
  if (!event) notFound()

  return <StaffShiftSummaryView key={event.id} event={event} />
}
