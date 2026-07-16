"use client"

import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { PermitSubmissionView } from "@/components/organizer/permits/PermitSubmissionView"

/** Permit submission (EM-28): dedicated screen wired to GET/PUT /permits. */
export default function EventPermitsPage() {
  const { event, refresh } = useWorkspaceEvent()
  return (
    <PermitSubmissionView eventId={event.id} reviewStatus={event.reviewStatus} onSaved={refresh} />
  )
}
