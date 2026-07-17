/**
 * Maps the wizard's CreateEventForm to the backend organizer API and saves it:
 *  1. uploads local previews (banner/poster/logo/ticket art → /api/uploads/images,
 *     hand-drawn signature → /api/uploads/signatures),
 *  2. POST /api/organizer/events (create) or PUT + bulk ticket configure (re-save).
 * Permit documents are uploaded on selection (LogisticsPermitStep) and arrive
 * here already carrying their /uploads/permits/... URL.
 */
import { clientApi } from "@/lib/client-api"
import { slugify, type CreateEventForm, type EventShow, type TicketType } from "./create-event-data"

const MONGO_ID = /^[0-9a-f]{24}$/i

export interface SavedEventResult {
  eventId: string
  /** FE show id → server show id, computed from the exact set that was sent. */
  showIdMap: { feShowId: string; serverId: string }[]
  /** Uploaded /uploads URLs to merge back into the form so re-saves don't
   *  re-upload the same assets (and the signature URL stays stable). */
  assetPatch: Partial<CreateEventForm>
}

/** Upload a local preview (blob:/data: URL) and return the stored /uploads URL. */
async function uploadLocalFile(
  kind: "images" | "signatures",
  src: string,
  baseName: string
): Promise<string> {
  if (src.startsWith("/uploads/")) return src // already stored on the server
  const blob = await fetch(src).then((r) => r.blob())
  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"
  const formData = new FormData()
  formData.append("file", blob, `${baseName}.${ext}`)
  const res = await fetch(`/api/uploads/${kind}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.data?.url) {
    throw new Error(json?.message || "Tải file lên thất bại — vui lòng thử lại")
  }
  return json.data.url as string
}

/** FE-side gate mirroring the BE rules, with friendly Vietnamese messages. */
function validateForm(form: CreateEventForm): void {
  if (!form.name.trim()) throw new Error("Vui lòng nhập tên sự kiện (bước 1)")
  if (!form.bannerImage) throw new Error("Vui lòng tải ảnh nền sự kiện (bước 1)")
  if (!form.category) throw new Error("Vui lòng chọn thể loại sự kiện (bước 1)")
  if (form.locationType === "offline") {
    if (!form.venueName.trim() || !form.province || !form.ward || !form.street.trim()) {
      throw new Error(
        "Vui lòng nhập đủ địa điểm: tên địa điểm, tỉnh/thành, phường/xã, số nhà & đường (bước 1)"
      )
    }
  } else if (!form.street.trim()) {
    throw new Error("Vui lòng nhập link tham gia sự kiện online (bước 1)")
  }
  const validShows = form.shows.filter((s) => s.startTime && s.endTime)
  if (validShows.length === 0) {
    throw new Error("Vui lòng thêm ít nhất 1 suất diễn với thời gian bắt đầu/kết thúc (bước 2)")
  }
  if (validShows.flatMap((s) => s.tickets).length === 0) {
    throw new Error("Vui lòng tạo ít nhất 1 loại vé (bước 2)")
  }
  if (form.contractAgreed && !form.signatureDataUrl) {
    throw new Error("Vui lòng ký tên trước khi đồng ý hợp đồng (bước 5)")
  }
}

/** datetime-local string → ISO, silently dropped when unparseable. */
function toIso(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

async function mapTicket(t: TicketType) {
  return {
    ticketName: t.name,
    price: t.isFree ? 0 : t.price,
    quantity: t.quantity,
    minPerOrder: t.minPerOrder,
    maxPerOrder: t.maxPerOrder,
    description: t.description || undefined,
    image: t.image ? await uploadLocalFile("images", t.image, "ve") : undefined,
    saleStart: toIso(t.saleStart),
    saleEnd: toIso(t.saleEnd),
  }
}

async function buildPayload(form: CreateEventForm) {
  const banner = await uploadLocalFile("images", form.bannerImage!, "anh-nen")
  const posterImage = form.posterImage
    ? await uploadLocalFile("images", form.posterImage, "poster")
    : undefined
  const orgLogo = form.orgLogo ? await uploadLocalFile("images", form.orgLogo, "logo") : undefined
  const signatureUrl = form.signatureDataUrl
    ? await uploadLocalFile("signatures", form.signatureDataUrl, "chu-ky")
    : undefined

  // Everything below works on this snapshot — the same filtered list drives
  // the payload, the capacity sum and the FE↔server show-id mapping.
  const sentShows: EventShow[] = form.shows.filter((s) => s.startTime && s.endTime)

  const shows = await Promise.all(
    sentShows.map(async (s) => ({
      // Only real server ids ride along; FE-generated ids mean "new show".
      _id: MONGO_ID.test(s.id) ? s.id : undefined,
      title: s.title.trim() || undefined,
      startTime: new Date(s.startTime).toISOString(),
      endTime: new Date(s.endTime).toISOString(),
      tickets: await Promise.all(s.tickets.map(mapTicket)),
    }))
  )

  // No explicit capacity field in the wizard — derive from the inventory
  // actually being sent.
  const capacity = Math.max(
    1,
    sentShows.flatMap((s) => s.tickets).reduce((sum, t) => sum + (t.quantity || 0), 0)
  )

  // Merged into the form after a successful save: previews switch from
  // blob:/data: to the stored URLs, so re-saves skip re-uploading.
  const assetPatch: Partial<CreateEventForm> = {
    bannerImage: banner,
    ...(posterImage ? { posterImage } : {}),
    ...(orgLogo ? { orgLogo } : {}),
    ...(signatureUrl ? { signatureDataUrl: signatureUrl } : {}),
  }

  return {
    sentShowIds: sentShows.map((s) => s.id),
    assetPatch,
    payload: {
      title: form.name.trim(),
      description: form.description,
      categoryId: form.category,
      capacity,
      banner,
      posterImage,
      locationType: form.locationType,
      ...(form.locationType === "offline"
        ? {
            venue: {
              name: form.venueName.trim(),
              province: form.province,
              ward: form.ward,
              street: form.street.trim(),
            },
          }
        : { location: form.street.trim() }),
      orgName: form.orgName.trim() || undefined,
      orgLogo,
      orgInfo: form.orgInfo.trim() || undefined,
      shows,
      // Send exactly what the settings step previews (slugified form).
      slug: slugify(form.slug.trim()) || undefined,
      privacy: form.privacy,
      confirmationMessage: form.confirmationMessage.trim() || undefined,
      logisticsServices: form.logisticsServices,
      permitDocuments: form.permitDocuments.map((d) => ({
        name: d.name,
        url: d.url,
        sizeKb: d.sizeKb,
      })),
      ...(form.contractRepName.trim() || form.contractAgreed
        ? {
            contract: {
              repName: form.contractRepName.trim() || undefined,
              agreed: form.contractAgreed,
              signatureUrl,
            },
          }
        : {}),
      ...(form.bankName || form.bankAccountNumber || form.bankAccountHolder
        ? {
            paymentInfo: {
              bankName: form.bankName || undefined,
              accountNumber: form.bankAccountNumber || undefined,
              accountHolder: form.bankAccountHolder.trim() || undefined,
            },
          }
        : {}),
    },
  }
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

interface ServerShow {
  _id: string
}

/**
 * Save the wizard as a DRAFT event. First save POSTs everything in one call;
 * re-saves PUT the event (shows without tickets) then bulk-replace the ticket
 * set per show — draft-only, so full replacement is safe.
 */
export async function saveEventDraft(
  form: CreateEventForm,
  eventId?: string
): Promise<SavedEventResult> {
  validateForm(form)
  const { sentShowIds, assetPatch, payload } = await buildPayload(form)

  // The server persists shows in submitted order, so index i of the response
  // corresponds to sentShowIds[i] — mapped back by FE id, never by position
  // in the (possibly larger, blank-row-containing) form.shows array.
  const toShowIdMap = (serverShows: ServerShow[]) =>
    sentShowIds.map((feShowId, i) => ({ feShowId, serverId: serverShows[i]?._id ?? feShowId }))

  if (!eventId) {
    const res = await clientApi.post<
      ApiEnvelope<{ event: { _id: string; shows: ServerShow[] } }>
    >("/organizer/events", payload)
    return {
      eventId: res.data.event._id,
      showIdMap: toShowIdMap(res.data.event.shows ?? []),
      assetPatch,
    }
  }

  const { shows, ...eventFields } = payload
  const updated = await clientApi.put<ApiEnvelope<{ _id: string; shows: ServerShow[] }>>(
    `/organizer/events/${eventId}`,
    { ...eventFields, shows: shows.map(({ tickets: _tickets, ...times }) => times) }
  )
  const serverShows = updated.data.shows ?? []

  // Bulk ticket configuration: rows map onto the saved shows by index.
  const ticketRows = shows.flatMap((s, i) =>
    s.tickets.map((t) => ({ ...t, showId: serverShows[i]?._id }))
  )
  await clientApi.put(`/organizer/events/${eventId}/tickets`, { tickets: ticketRows })

  return { eventId, showIdMap: toShowIdMap(serverShows), assetPatch }
}
