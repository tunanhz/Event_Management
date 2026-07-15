import type { Metadata } from "next"
import { StaffAttendeesView } from "@/components/staff/StaffAttendeesView"

export const metadata: Metadata = {
  title: "Người tham dự | EventBox",
  description: "Tra cứu người tham dự và check-in thủ công khi khách không quét được mã QR.",
}

/** Attendee lookup + manual check-in — /staff/check-in/[eventId]/attendees. */
export default async function StaffAttendeesPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  return <StaffAttendeesView eventId={eventId} />
}
