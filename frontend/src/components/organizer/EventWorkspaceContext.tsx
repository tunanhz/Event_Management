"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { Loader2, AlertTriangle } from "lucide-react"
import { useOrganizerTitle } from "./OrganizerShellContext"
import type { OrganizerEvent } from "./my-events-data"
import {
  fetchOrganizerEventDetail,
  type ServerEventDetail,
  type ServerEventShow,
} from "./organizer-event-detail-api"

interface WorkspaceValue {
  /** Display shape consumed by summary / seatmap / check-in / orders. */
  event: OrganizerEvent
  /** Raw detail (event + tickets) — used by the edit wizard to rebuild the form. */
  detail: ServerEventDetail
  /** The event's shows (suất diễn), in saved order; empty for legacy events. */
  shows: ServerEventShow[]
  /**
   * Show filter shared by every report tab (Tổng kết / Check-in / Đơn hàng /
   * Phân tích): null = "Tất cả suất diễn". Kept here so switching tabs keeps
   * the same suất diễn selected.
   */
  selectedShowId: string | null
  setSelectedShowId: (id: string | null) => void
  /**
   * Re-fetch this event's detail and push it back into the shared context.
   * The dedicated sub-screens (Lịch trình, Giấy phép, the edit wizard) each
   * save through their own endpoint, bypassing this provider entirely — so
   * without calling this afterward, every *other* workspace tab keeps
   * serving whatever it loaded on its own first mount. A same-tab client-side
   * navigation to another tab does not remount the provider (only the leaf
   * page), so it would otherwise show stale data until a full page reload.
   */
  refresh: () => Promise<void>
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
  const [value, setValue] = useState<{
    event: OrganizerEvent
    detail: ServerEventDetail
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Shared per-show filter; the provider remounts per event (key={id} in the
  // layout), so a stale selection can never leak across events.
  const [selectedShowId, setSelectedShowId] = useState<string | null>(null)

  // Reusable loader exposed as `refresh` for callers outside this effect
  // (the dedicated sub-screens, after their own successful saves).
  const load = useCallback(async () => {
    const v = await fetchOrganizerEventDetail(eventId)
    setValue(v)
  }, [eventId])

  // Initial load — abort-guarded, and kept inline (not calling `load`) so no
  // setState runs synchronously in the effect body.
  useEffect(() => {
    let active = true
    fetchOrganizerEventDetail(eventId)
      .then((v) => {
        if (active) {
          setValue(v)
          setError(null)
        }
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

  const shows = (value.detail.event.shows ?? []).filter((s) => s._id)

  return (
    <EventWorkspaceContext.Provider
      value={{
        ...value,
        shows,
        // A selection pointing at a since-deleted show falls back to "all".
        selectedShowId: shows.some((s) => s._id === selectedShowId) ? selectedShowId : null,
        setSelectedShowId,
        refresh: load,
      }}
    >
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
