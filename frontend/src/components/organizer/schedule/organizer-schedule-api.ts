/**
 * Schedule ("Lịch trình") client API — manages the event's shows (suất diễn).
 * Talks to the same `PUT /organizer/events/:id` endpoint the "Chỉnh sửa"
 * wizard uses, sending only `shows` so the rest of the event is untouched.
 * The backend replaces the whole list: rows with `_id` update the matching
 * show, rows without one are created, and saved shows left out are deleted
 * (rejected server-side while they still have ticket tiers attached).
 */
import { clientApi } from "@/lib/client-api"

export interface ScheduleShowInput {
  /** Server show id — present for saved shows, absent for new rows. */
  _id?: string
  title?: string
  /** ISO timestamps. */
  startTime: string
  endTime: string
}

export interface SavedShow {
  _id: string
  title?: string
  startTime: string
  endTime: string
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

/**
 * Replace the event's show list. Throws with the backend's Vietnamese message
 * on any validation failure (past start, end before start, deleting a show
 * that still has tickets, event no longer editable, …).
 */
export async function updateEventShows(
  eventId: string,
  shows: ScheduleShowInput[]
): Promise<SavedShow[]> {
  const res = await clientApi.put<Envelope<{ shows: SavedShow[] }>>(
    `/organizer/events/${eventId}`,
    { shows }
  )
  return res.data.shows ?? []
}
