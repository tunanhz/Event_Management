/**
 * Types, constants and default content for the organizer "Create Event" wizard.
 * Kept dependency-free so both server and client components can import it.
 */

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6
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
  /** Organizer-facing label, e.g. "Đêm khai mạc". Optional — views fall back
   *  to an auto-numbered "Suất N". */
  title: string
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
  /** Step 2 — one or more shows (suất diễn), each with its own ticket tiers. */
  shows: EventShow[]
  /** Step 3 — settings. */
  slug: string
  privacy: EventPrivacy
  confirmationMessage: string
  /** Step 4 — logistics services requested from the platform. */
  logisticsServices: string[]
  /** Step 4 — uploaded legal permit / contract documents (metadata only). */
  permitDocuments: PermitDocument[]
  /** Step 5 — service contract. */
  contractRepName: string
  contractAgreed: boolean
  /** Hand-drawn signature as PNG data URL; uploaded on save. */
  signatureDataUrl: string | null
  /** Step 6 — payout bank account (revenue settlement). */
  bankName: string
  bankAccountNumber: string
  bankAccountHolder: string
}

/** An uploaded permit/contract file — `url` is returned by /api/uploads/permits. */
export interface PermitDocument {
  id: string
  name: string
  sizeKb: number
  url: string
}

/** Platform support services the organizer can request (per SRS wizard step 3). */
export const LOGISTICS_SERVICES: { id: string; label: string; description: string }[] = [
  { id: "tron-goi", label: "Dịch vụ trọn gói", description: "Cung cấp toàn bộ sân khấu, âm thanh, ánh sáng, bàn ghế và nhân sự." },
  { id: "san-khau", label: "Sân khấu", description: "Thiết kế, lắp đặt sân khấu theo yêu cầu." },
  { id: "am-thanh", label: "Âm thanh", description: "Hệ thống loa, mic, amply chuyên nghiệp." },
  { id: "anh-sang", label: "Ánh sáng", description: "Hệ thống đèn chiếu, đèn LED sự kiện." },
  { id: "ban-ghe", label: "Bàn ghế", description: "Cho thuê bàn ghế, backdrop, thảm đỏ." },
  { id: "nhan-su", label: "Nhân sự", description: "Staff hỗ trợ soát vé, PG, lễ tân, an ninh sự kiện." },
  { id: "khac", label: "Dịch vụ khác", description: "Tùy chọn dịch vụ khác do Ban tổ chức tự nhập." },
]

/** Upload constraints for permit documents (per SRS: PDF/DOCX/PNG, ≤ 15MB). */
export const PERMIT_FILE_RULES = {
  accept: ".pdf,.docx,.png",
  allowedExtensions: ["pdf", "docx", "png"],
  maxSizeMb: 15,
} as const

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
  return { id: genId("show"), title: "", startTime: "", endTime: "", tickets: [] }
}

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "Thông tin sự kiện" },
  { id: 2, label: "Thời gian & Loại vé" },
  { id: 3, label: "Cài đặt" },
  { id: 4, label: "Logistics & Giấy phép" },
  { id: 5, label: "Hợp đồng" },
  { id: 6, label: "Thông tin thanh toán" },
]

export const EVENT_CATEGORIES = [
  "Nhạc sống",
  "Sân khấu & Nghệ thuật",
  "Thể thao",
  "Hội thảo & Workshop",
  "Triển lãm",
  "Khác",
]

// Province/ward options come from the official 34-province dataset in
// /public/data/vietnam-provinces-wards.json — see use-vietnam-address-data.ts.

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
  // Empty, not a pre-filled template — RichTextEditor shows a ghost
  // placeholder via CSS (:empty::before) that vanishes on the first
  // keystroke, instead of baking example/instruction text in as if it were
  // the organizer's real content (which also let step-1 validation pass
  // without anyone ever writing an actual description).
  description: "",
  orgLogo: null,
  orgName: "",
  orgInfo: "",
  // Seed one show so the organizer lands on a ready-to-fill date range.
  shows: [{ id: "show-1", title: "", startTime: "", endTime: "", tickets: [] }],
  slug: "",
  privacy: "public",
  confirmationMessage: "",
  logisticsServices: [],
  permitDocuments: [],
  contractRepName: "",
  contractAgreed: false,
  signatureDataUrl: null,
  bankName: "",
  bankAccountNumber: "",
  bankAccountHolder: "",
}

/** Common Vietnamese banks for the payout account select (step 6). */
export const VN_BANKS = [
  "Vietcombank (VCB)",
  "VietinBank (CTG)",
  "BIDV",
  "Agribank",
  "Techcombank (TCB)",
  "MB Bank (MBB)",
  "ACB",
  "VPBank",
  "Sacombank (STB)",
  "TPBank",
  "SHB",
  "HDBank",
  "VIB",
  "MSB",
  "OCB",
  "SeABank",
  "Eximbank",
  "LPBank",
  "Nam A Bank",
  "SCB",
] as const

/** Value limits for the payment step. */
export const PAYMENT_LIMITS = {
  accountNumber: 30,
  accountHolder: 100,
} as const
