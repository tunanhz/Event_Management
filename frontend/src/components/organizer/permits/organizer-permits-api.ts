/**
 * Permit submission (EM-28 / EM-136) client API — talks to the *dedicated*
 * backend endpoints (not the create-event wizard save):
 *   GET /organizer/events/:id/permits   — list uploaded legal permit documents
 *   PUT /organizer/events/:id/permits   — bulk-replace the permit document list
 *
 * Files themselves are uploaded first to POST /api/uploads/permits (same as the
 * wizard's step 4); the PUT then persists only the returned metadata + URL.
 * The backend validates: extension ∈ {pdf,docx,png}, url under /uploads/permits/,
 * name required, sizeKb ≤ 15 MB. DRAFT/REJECTED-only for writes; GET stays
 * readable even after the event is submitted for review.
 */
import { clientApi } from "@/lib/client-api"

/** One permit document as the /permits endpoints exchange it. */
export interface PermitDoc {
  name: string
  url: string
  sizeKb?: number
  /** Set by the server at persist time; read-only for us. */
  uploadedAt?: string
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

/** GET the event's current permit documents. */
export async function fetchPermits(eventId: string): Promise<PermitDoc[]> {
  const res = await clientApi.get<Envelope<PermitDoc[]>>(
    `/organizer/events/${eventId}/permits`
  )
  return res.data ?? []
}

/**
 * PUT the whole permit-document list at once. At least one permit is required
 * to submit the event for review (enforced on the permits page's Save and by
 * the backend submit gate), so callers should not save an empty list. Throws
 * with the backend message on failure. Returns the saved list.
 */
export async function configurePermits(
  eventId: string,
  permitDocuments: PermitDoc[]
): Promise<PermitDoc[]> {
  // Only send the fields the backend persists — drop uploadedAt (server-owned).
  const payload = permitDocuments.map((d) => ({
    name: d.name,
    url: d.url,
    sizeKb: d.sizeKb,
  }))
  const res = await clientApi.put<Envelope<PermitDoc[]>>(
    `/organizer/events/${eventId}/permits`,
    { permitDocuments: payload }
  )
  return res.data ?? []
}

/**
 * Upload one permit file to /api/uploads/permits and return its stored metadata.
 * Uses a raw fetch (multipart/form-data) rather than clientApi, which forces a
 * JSON content-type. Caller is expected to have validated extension/size first.
 */
export async function uploadPermitFile(
  file: File
): Promise<{ name: string; url: string; sizeKb: number }> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/uploads/permits", {
    method: "POST",
    body: formData,
    credentials: "include",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.message || "Tải tệp lên thất bại — vui lòng thử lại")
  }
  return {
    name: file.name,
    url: json.data.url as string,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
  }
}
