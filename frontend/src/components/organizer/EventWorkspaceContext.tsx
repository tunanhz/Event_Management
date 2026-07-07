"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { useOrganizerTitle } from "./OrganizerShellContext"
import type { OrganizerEvent } from "./my-events-data"
import {
  fetchOrganizerEventDetail,
  type ServerEventDetail,
} from "./organizer-event-detail-api"

interface WorkspaceValue {
  /** Display shape consumed by summary / seatmap / check-in / orders. */
  event: OrganizerEvent
  /** Raw detail (event + tickets) — used by the edit wizard to rebuild the form. */
  detail: ServerEventDetail
}

const EventWorkspaceContext = createContext<WorkspaceValue | null>(null)

const centered: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  minHeight: 320,
  color: "#64748b",
  textAlign: "center",
}

/**
 * Loads a single event's detail once and shares it across the workspace pages
 * (summary, members, edit, …) via context. Replaces the old mock lookup +
 * notFound() gate so real API events open instead of 404-ing.
 */
export function EventWorkspaceProvider({
  eventId,
  children,
}: {
  eventId: string
  children: ReactNode
}) {
  const [value, setValue] = useState<WorkspaceValue | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The provider is keyed by eventId in the layout, so it remounts (and state
  // resets to the loading placeholder) whenever the organizer opens a different
  // event — this effect just fetches once per event.
  useEffect(() => {
    let active = true
    fetchOrganizerEventDetail(eventId)
      .then((v) => {
        if (active) setValue(v)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Không tải được sự kiện")
      })
    return () => {
      active = false
    }
  }, [eventId])

  // Keep the shared top-bar title in sync with the loaded event.
  useOrganizerTitle(value?.event.title ?? "Đang tải…")

  if (error) {
    return (
      <div style={centered} role="alert">
        <AlertTriangle size={48} aria-hidden="true" style={{ color: "#ef4444" }} />
        <p style={{ fontWeight: 600, color: "#0f172a" }}>Không mở được sự kiện</p>
        <p style={{ maxWidth: 420 }}>{error}</p>
      </div>
    )
  }

  if (!value) {
    return (
      <div style={centered} role="status" aria-live="polite">
        <Loader2
          size={40}
          aria-hidden="true"
          style={{ animation: "spin 0.8s linear infinite" }}
        />
        <p>Đang tải sự kiện…</p>
      </div>
    )
  }

  return (
    <EventWorkspaceContext.Provider value={value}>
      {children}
    </EventWorkspaceContext.Provider>
  )
}

/** Read the current event workspace context (event + raw detail). */
export function useWorkspaceEvent(): WorkspaceValue {
  const ctx = useContext(EventWorkspaceContext)
  if (!ctx) {
    throw new Error("useWorkspaceEvent must be used within EventWorkspaceProvider")
  }
  return ctx
}
