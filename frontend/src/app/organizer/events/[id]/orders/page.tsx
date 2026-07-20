"use client"

import { useEffect, useState } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { useWorkspaceEvent } from "@/components/organizer/EventWorkspaceContext"
import { EventShowHeader } from "@/components/organizer/shared/EventShowHeader"
import { fetchEventAttendees } from "@/components/organizer/manage/organizer-attendees-api"
import type { EventAttendee } from "@/components/organizer/manage/attendee-tracker-data"
import { AttendeeTrackerView } from "@/components/organizer/manage/AttendeeTrackerView"

const centered: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  minHeight: 240,
  color: "var(--muted-foreground)",
  textAlign: "center",
}

/** Orders ("Đơn hàng"): real attendee tracker fed by /registrations,
 *  scoped per suất diễn via the shared "Đổi suất diễn" switcher. */
export default function EventOrdersPage() {
  const { event, selectedShowId } = useWorkspaceEvent()
  const [attendees, setAttendees] = useState<EventAttendee[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchEventAttendees(event.id, selectedShowId)
      .then((rows) => {
        if (active) setAttendees(rows)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Không tải được danh sách đơn hàng")
      })
    return () => {
      active = false
    }
  }, [event.id, selectedShowId])

  if (error) {
    return (
      <div style={centered} role="alert">
        <AlertTriangle size={40} aria-hidden="true" style={{ color: "#ef4444" }} />
        <p>{error}</p>
      </div>
    )
  }
  if (!attendees) {
    return (
      <div style={centered} role="status" aria-live="polite">
        <Loader2 size={36} aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }} />
        <p>Đang tải danh sách đơn hàng…</p>
      </div>
    )
  }

  return (
    <>
      <EventShowHeader />
      <AttendeeTrackerView eventId={event.id} eventTitle={event.title} attendees={attendees} />
    </>
  )
}
