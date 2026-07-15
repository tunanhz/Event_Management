import type { Metadata } from "next"
import { StaffOfflineSaleView } from "@/components/staff/StaffOfflineSaleView"

export const metadata: Metadata = {
  title: "Bán vé tại quầy | EventBox",
  description: "Bán vé trực tiếp cho khách mua tại cổng sự kiện.",
}

/** Offline ticket sale at the gate — /staff/check-in/[eventId]/offline-sale. */
export default async function StaffOfflineSalePage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  return <StaffOfflineSaleView eventId={eventId} />
}
