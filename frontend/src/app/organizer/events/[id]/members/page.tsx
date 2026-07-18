"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { MembersView } from "@/components/organizer/members/MembersView"

/** Members ("Thành viên"): staff assigned to this event (real API). */
export default function EventMembersPage() {
  const { event } = useWorkspaceEvent()
  return <MembersView eventId={event.id} />
}
