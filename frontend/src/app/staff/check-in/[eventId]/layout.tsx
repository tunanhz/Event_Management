import { StaffEventTabs } from "@/components/staff/StaffEventTabs"

/** Shell for one assigned event's check-in workspace: back link + section tabs. */
export default async function StaffEventCheckInLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  return (
    <div>
      <StaffEventTabs eventId={eventId} />
      {children}
    </div>
  )
}
