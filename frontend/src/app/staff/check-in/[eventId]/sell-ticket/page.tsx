import type { Metadata } from "next"
import { StaffOfflineSalesView } from "@/components/staff/StaffOfflineSalesView"

export const metadata: Metadata = {
  title: "Bán vé tại quầy | EventBox",
  description: "Trạm bán vé offline và check-in trực tiếp cho khách vãng lai tại cổng sự kiện.",
}

export default async function StaffOfflineSalesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  return <StaffOfflineSalesView eventId={eventId} />
}
