/**
 * Types, constants and default content for the organizer "Create Event" wizard.
 * Kept dependency-free so both server and client components can import it.
 */

export type WizardStep = 1 | 2 | 3 | 4 | 5
export type LocationType = "offline" | "online"
/** Who can book: everyone (public) or link-holders only (private). */
export type EventPrivacy = "public" | "private"

/** One sellable ticket tier inside a show (e.g. VIP, SVIP). */
export interface TicketType {
  id: string
  name: string
  /** Unit price in VND. Ignored when `isFree` is true. */
  price: number
  isFree: boolean
  /** Total inventory for this tier. */
  quantity: number
  /** Min / max tickets a single order may buy. */
  minPerOrder: number
  maxPerOrder: number
  /** Sale window — `datetime-local` strings (YYYY-MM-DDTHH:mm). */
  saleStart: string
  saleEnd: string
  description: string
  /** Object URL preview of the ticket artwork. */
  image: string | null
}

/** A single showing/occurrence with its own date range and ticket tiers. */
export interface EventShow {
  id: string
  startTime: string
  endTime: string
  tickets: TicketType[]
}

export interface CreateEventForm {
  /** Poster shown across the platform (portrait 720x958). Object URL for preview. */
  posterImage: string | null
  /** Wide cover/banner (landscape 1280x720). Object URL for preview. */
  bannerImage: string | null
  name: string
  locationType: LocationType
  venueName: string
  province: string
  ward: string
  street: string
  category: string
  /** Rich-text HTML from the description editor. */
  description: string
  orgLogo: string | null
  orgName: string
  orgInfo: string
  /** Step 2 — one or more shows, each with its own ticket tiers. */
  shows: EventShow[]
  /** Step 3 — settings. */
  slug: string
  privacy: EventPrivacy
  confirmationMessage: string
  enableQuestions: boolean
  /** Step 4 — service contract. */
  contractRepName: string
  contractAgreed: boolean
}

/** Character limits mirrored from the reference UI. */
export const LIMITS = {
  name: 100,
  venueName: 80,
  street: 80,
  orgName: 80,
  orgInfo: 500,
} as const

/** Character / value limits for the ticket-type modal. */
export const TICKET_LIMITS = {
  name: 50,
  description: 1000,
} as const

/** Character limits for the settings step. */
export const SETTINGS_LIMITS = {
  slug: 80,
  confirmationMessage: 500,
} as const

/** Base used to preview the public event URL on the settings step. */
export const EVENT_URL_PATH = "/su-kien"

/**
 * Turn free text into a URL-safe slug (handles Vietnamese diacritics + đ).
 * Used for the "Tùy chỉnh đường dẫn" preview.
 */
export function slugify(input: string): string {
  return input
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Client-only id generator; falls back to a counter where crypto is absent. */
let _idSeq = 0
function genId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  _idSeq += 1
  return `${prefix}-${_idSeq}`
}

/** A blank ticket tier with the reference defaults pre-filled. */
export function createEmptyTicket(): TicketType {
  return {
    id: genId("ticket"),
    name: "",
    price: 0,
    isFree: false,
    quantity: 10,
    minPerOrder: 1,
    maxPerOrder: 10,
    saleStart: "",
    saleEnd: "",
    description: "",
    image: null,
  }
}

/** A blank show with an empty ticket list. */
export function createEmptyShow(): EventShow {
  return { id: genId("show"), startTime: "", endTime: "", tickets: [] }
}

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "Thông tin sự kiện" },
  { id: 2, label: "Thời gian & Loại vé" },
  { id: 3, label: "Cài đặt" },
  { id: 4, label: "Hợp đồng" },
  { id: 5, label: "Thông tin thanh toán" },
]

export const EVENT_CATEGORIES = [
  "Nhạc sống",
  "Sân khấu & Nghệ thuật",
  "Thể thao",
  "Hội thảo & Workshop",
  "Triển lãm",
  "Khác",
]

export const PROVINCES = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bình Dương",
  "Bình Định",
  "Đồng Nai",
  "Khánh Hòa",
  "Lâm Đồng",
  "Nghệ An",
  "Quảng Ninh",
  "Thừa Thiên Huế",
]

/**
 * Sample wards for the most common cities; other provinces fall back to a
 * generic centre option. Enough for a realistic dependent-select without
 * bundling the full administrative dataset.
 */
const WARDS_BY_PROVINCE: Record<string, string[]> = {
  "Hà Nội": ["Phường Hàng Bạc", "Phường Cửa Nam", "Phường Kim Mã", "Phường Dịch Vọng"],
  "TP. Hồ Chí Minh": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Đa Kao", "Phường Tân Định"],
  "Đà Nẵng": ["Phường Hải Châu 1", "Phường Thạch Thang", "Phường Thanh Bình"],
}

export function getWards(province: string): string[] {
  if (!province) return []
  return WARDS_BY_PROVINCE[province] ?? ["Phường trung tâm", "Phường lân cận"]
}

/** Pre-filled description template shown in the reference editor. */
export const DEFAULT_DESCRIPTION_HTML = `<p><strong>Giới thiệu sự kiện:</strong></p>
<p>[Tóm tắt ngắn gọn về sự kiện: Nội dung chính của sự kiện, điểm đặc sắc nhất và lý do khiến người tham gia không nên bỏ lỡ]</p>
<p><strong>Chi tiết sự kiện:</strong></p>
<ul>
<li><strong>Chương trình chính:</strong> [Liệt kê những hoạt động nổi bật trong sự kiện: các phần trình diễn, khách mời đặc biệt, lịch trình các tiết mục cụ thể nếu có.]</li>
<li><strong>Khách mời:</strong> [Thông tin về các khách mời đặc biệt, nghệ sĩ, diễn giả sẽ tham gia sự kiện.]</li>
<li><strong>Trải nghiệm đặc biệt:</strong> [Nếu có các hoạt động đặc biệt khác như workshop, khu trải nghiệm, photo booth, khu vực check-in hay các phần quà/ưu đãi dành riêng cho người tham dự.]</li>
</ul>
<p><strong>Điều khoản và điều kiện:</strong></p>
<p>[TnC] sự kiện</p>
<p>Lưu ý về điều khoản trẻ em</p>
<p>Lưu ý về điều khoản VAT</p>`

export const INITIAL_FORM: CreateEventForm = {
  posterImage: null,
  bannerImage: null,
  name: "",
  locationType: "offline",
  venueName: "",
  province: "",
  ward: "",
  street: "",
  category: "",
  description: DEFAULT_DESCRIPTION_HTML,
  orgLogo: null,
  orgName: "",
  orgInfo: "",
  // Seed one show so the organizer lands on a ready-to-fill date range.
  shows: [{ id: "show-1", startTime: "", endTime: "", tickets: [] }],
  slug: "",
  privacy: "public",
  confirmationMessage: "",
  enableQuestions: false,
  contractRepName: "",
  contractAgreed: false,
}
