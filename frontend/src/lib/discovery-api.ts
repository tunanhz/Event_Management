/**
 * Public event-discovery data layer — homepage, /su-kien listing and detail.
 * Fetches the real backend public endpoints and maps the API shape onto the
 * presentational types the existing components already consume (EventItem,
 * ExploreEvent, FeaturedStar, banners, EventDetail), so wiring is a data-source
 * swap rather than a component rewrite.
 *
 * These run in Server Components, so an absolute backend URL is used (relative
 * "/api" only resolves in the browser via the Next.js rewrite).
 */
import type { EventItem } from "@/components/home/EventCard"
import type {
  ContentBlock,
  EventCity,
  ExploreEvent,
  FeaturedStar,
  ShowOption,
  TicketType,
} from "@/lib/mockData"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const DEFAULT_EVENT_IMAGE = "/event-placeholder.svg"
const DEFAULT_AVATAR_IMAGE = "/avatar-placeholder.svg"

// ── Raw API shapes (subset we consume) ──────────────────────────────
interface ApiEvent {
  _id: string
  title: string
  date?: string
  time?: string
  startDate?: string
  endDate?: string
  location?: string
  imageUrl?: string
  banner?: string
  category?: string
  categorySlug?: string
  city?: EventCity
  priceFrom?: number
  isFree?: boolean
  isFeatured?: boolean
  isTrending?: boolean
  description?: string
  contentBlocks?: ContentBlock[]
  sessions?: { date?: string; time?: string; label?: string }[]
  shows?: { _id: string; title?: string; startTime: string; endTime: string }[]
  organizer?: string
  organizerLogoUrl?: string
  organizerDescription?: string
}

interface ApiTicket {
  _id: string
  ticketName: string
  price: number
  minPerOrder: number
  maxPerOrder: number
  showId?: string
}

interface ApiStar {
  _id: string
  name: string
  slug: string
  imageUrl?: string
  verified?: boolean
}

interface ApiBanner {
  _id: string
  title: string
  subtitle?: string
  imageUrl?: string
  ctaLabel?: string
  linkUrl?: string
}

/** GET /api/<path>; returns `data` (or the given fallback on any failure so a
 *  down backend degrades to an empty section instead of crashing the page). */
async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { cache: "no-store" })
    if (!res.ok) return fallback
    const json = await res.json()
    return (json.data ?? fallback) as T
  } catch {
    return fallback
  }
}

// ── Formatting helpers (match the existing mock display strings) ─────
function formatDate(iso?: string): string {
  if (!iso) return "Chưa đặt lịch"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "Chưa đặt lịch"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function formatPrice(priceFrom?: number, isFree?: boolean): string {
  if (isFree || !priceFrom) return "Miễn phí"
  return `Từ ${priceFrom.toLocaleString("vi-VN")}đ`
}

const eventImage = (e: ApiEvent) => e.imageUrl || e.banner || DEFAULT_EVENT_IMAGE

/** Preserve the existing UI rule: an event becomes past after its local day ends. */
function isPastEventDay(value?: string): boolean {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const endOfDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  )
  return endOfDay.getTime() < Date.now()
}

/** Event.shows[] → presentational options, oldest first, auto-labelled when the
 *  organizer didn't name the showing ("Suất chiều" etc). */
function toShowOptions(shows: ApiEvent["shows"]): ShowOption[] {
  return [...(shows ?? [])]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((s, i) => ({
      id: s._id,
      label: s.title?.trim() || `Suất ${i + 1}`,
      startTime: s.startTime,
      endTime: s.endTime,
    }))
}

// ── Mappers ─────────────────────────────────────────────────────────
function toEventItem(e: ApiEvent): EventItem {
  return {
    id: e._id,
    title: e.title,
    date: formatDate(e.date ?? e.startDate),
    time: e.time || "",
    location: e.location || "Đang cập nhật",
    price: formatPrice(e.priceFrom, e.isFree),
    image: eventImage(e),
    category: e.category || "Sự kiện",
    isPast: isPastEventDay(e.date ?? e.startDate),
  }
}

function toExploreEvent(e: ApiEvent): ExploreEvent {
  const collections = [
    ...(e.isFeatured ? ["featured"] : []),
    ...(e.isTrending ? ["trending"] : []),
    "upcoming",
  ]
  return {
    ...toEventItem(e),
    isFeatured: e.isFeatured,
    city: e.city ?? "other",
    categorySlug: e.categorySlug || "khac",
    isFree: e.isFree ?? false,
    collections,
  }
}

// ── Public fetchers ─────────────────────────────────────────────────
export interface HomeData {
  banners: { id: string; title: string; subtitle: string; image: string; cta: string; link: string }[]
  stars: FeaturedStar[]
  featured: EventItem[]
  trending: EventItem[]
  upcoming: EventItem[]
}

export function isUpcomingEvent(e: ApiEvent): boolean {
  const now = Date.now()

  const parseDate = (dStr?: string | Date) => {
    if (!dStr) return NaN
    if (typeof dStr === "number") return dStr
    if (dStr instanceof Date) return dStr.getTime()
    const str = String(dStr)
    if (str.includes("/")) {
      const parts = str.split(" ")
      const datePart = parts[0]
      const timePart = parts[1] || "00:00"
      const [d, m, y] = datePart.split("/")
      const [hh, mm] = timePart.split(":")
      if (d && m && y) {
        return new Date(
          parseInt(y, 10),
          parseInt(m, 10) - 1,
          parseInt(d, 10),
          parseInt(hh || "0", 10),
          parseInt(mm || "0", 10)
        ).getTime()
      }
    }
    return new Date(str).getTime()
  }

  const start = parseDate(e.startDate || e.date)
  if (!Number.isNaN(start)) {
    return start >= now
  }

  return false
}

/** Everything the homepage needs, fetched in parallel. */
export async function fetchHomeData(): Promise<HomeData> {
  const [activeBanners, eventsForBanners, stars, featured, trending, upcoming] = await Promise.all([
    apiGet<any[]>("/banners", []),
    apiGet<ApiEvent[]>("/events?limit=5", []),
    apiGet<ApiStar[]>("/stars", []),
    apiGet<ApiEvent[]>("/events?collection=featured&limit=8", []),
    apiGet<ApiEvent[]>("/events?collection=trending&limit=8", []),
    apiGet<ApiEvent[]>("/events?collection=upcoming&limit=8&sort=date&order=asc", []),
  ])

  const bannersMapped = activeBanners.length > 0
    ? activeBanners.map((b) => ({
        id: b._id || b.eventId || "banner-" + Math.random(),
        title: b.title,
        subtitle: b.subtitle || "Khám phá sự kiện nổi bật trên EventBox.",
        image: b.imageUrl || DEFAULT_EVENT_IMAGE,
        cta: b.ctaLabel || "Khám phá ngay",
        link: b.linkUrl || "#",
      }))
    : eventsForBanners.filter(isUpcomingEvent).map((e) => ({
        id: e._id,
        title: e.title,
        subtitle: e.description ? e.description.replace(/<[^>]*>/g, "").slice(0, 120) : "Khám phá sự kiện nổi bật trên EventBox.",
        image: e.banner || e.imageUrl || DEFAULT_EVENT_IMAGE,
        cta: "Khám phá ngay",
        link: `/su-kien/${e._id}`,
      }))

  return {
    banners: bannersMapped,
    stars: stars.map((s) => ({ id: s._id, name: s.name, slug: s.slug, image: s.imageUrl || DEFAULT_AVATAR_IMAGE, verified: s.verified })),
    featured: featured.filter(isUpcomingEvent).map(toEventItem),
    trending: trending.filter(isUpcomingEvent).map(toEventItem),
    upcoming: upcoming.filter(isUpcomingEvent).map(toEventItem),
  }
}

/** Listing page pool — every published event, mapped for the explorer/filters. */
export async function fetchExploreEvents(): Promise<ExploreEvent[]> {
  const events = await apiGet<ApiEvent[]>("/events?limit=100", [])
  return events.filter(isUpcomingEvent).map(toExploreEvent)
}

/** Header search bar — GET /api/events/search?q=..., matches title/description/location/organizer/category. */
export async function fetchSearchEvents(q: string): Promise<ExploreEvent[]> {
  const events = await apiGet<ApiEvent[]>(`/events/search?q=${encodeURIComponent(q)}&limit=100`, [])
  return events.filter(isUpcomingEvent).map(toExploreEvent)
}

export interface EventDetailData {
  event: EventItem
  showDates: string[]
  description: ContentBlock[]
  descriptionHtml?: string
  organizer: { name: string; logo: string; description: string }
  shows: ShowOption[]
  tickets: TicketType[]
  related: EventItem[]
}

/** Detail page — GET /api/events/:id/detail returns { event, tickets, related }. */
export async function fetchEventDetail(id: string): Promise<EventDetailData | null> {
  const data = await apiGet<{ event: ApiEvent; tickets: ApiTicket[]; related: ApiEvent[] } | null>(
    `/events/${id}/detail`,
    null
  )
  if (!data?.event) return null
  const e = data.event
  const showDates = (e.sessions ?? []).map((s) => formatDate(s.date)).filter((d) => d !== "Chưa đặt lịch")
  return {
    event: toEventItem(e),
    // Curated blocks if present; otherwise the detail page renders descriptionHtml.
    description: e.contentBlocks ?? [],
    descriptionHtml: (e.contentBlocks?.length ?? 0) === 0 ? e.description : undefined,
    showDates: showDates.length > 0 ? showDates : [formatDate(e.date ?? e.startDate)],
    organizer: {
      name: e.organizer || "EventBox Organizer",
      logo: e.organizerLogoUrl || DEFAULT_AVATAR_IMAGE,
      description: e.organizerDescription || "Đơn vị tổ chức trên nền tảng EventBox.",
    },
    shows: toShowOptions(e.shows),
    tickets: (data.tickets ?? []).map((t) => ({
      id: t._id,
      name: t.ticketName,
      price: t.price,
      minPerOrder: t.minPerOrder,
      maxPerOrder: t.maxPerOrder,
      showId: t.showId,
    })),
    related: (data.related ?? []).filter(isUpcomingEvent).map(toEventItem),
  }
}
