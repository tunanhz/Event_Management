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
  // Plain-text (tags stripped) length cap for the rich-text event description.
  description: 2000,
} as const

/** Character / value limits for the ticket-type modal. */
export const TICKET_LIMITS = {
  name: 50,
  description: 1000,
  // Ticket price must stay under 1 tỷ VND — exclusive upper bound (price < maxPrice).
  maxPrice: 1_000_000_000,
} as const

/** Ticket sales must close this far before the show starts, so check-in opens
 *  against a settled attendee list. Mirrors TICKET_SALE_END_LEAD_MS in the
 *  backend's event-wizard-validation.ts — keep both in step. */
export const TICKET_SALE_END_LEAD_MS = 30 * 60 * 1000

/** Format a Date as a local `datetime-local` value (YYYY-MM-DDTHH:mm).
 *  Local — not UTC — so a pre-filled value matches the organizer's clock. */
export function toLocalDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * Latest `saleEnd` allowed for a tier selling into a show that starts at
 * `showStart` — 30 minutes earlier. Both sides are `datetime-local` strings, so
 * callers can compare them lexicographically like the wizard's other dates.
 * Returns "" when the show has no usable start time yet (nothing to cap against).
 */
export function saleEndCapFor(showStart: string): string {
  if (!showStart) return ""
  const t = new Date(showStart).getTime()
  if (Number.isNaN(t)) return ""
  return toLocalDateTime(new Date(t - TICKET_SALE_END_LEAD_MS))
}

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

/**
 * Starter content for the event-description editor. Shown pre-filled and fully
 * editable (not a ghost placeholder) on new events, so organizers begin from a
 * structured outline instead of a blank box. Bracketed "[…]" prompts mark the
 * parts they should replace; the Điều khoản section is usable as-is. Structure
 * maps to the editor toolbar (h3 headings / ul lists / p paragraphs).
 */
export const DESCRIPTION_TEMPLATE = `<h3>🎬 Giới thiệu sự kiện</h3>
<p>[Viết 2–3 câu giới thiệu tổng quan: sự kiện là gì, dành cho ai và điểm đặc biệt khiến khán giả không thể bỏ lỡ.]</p>
<h3>✨ Điểm nhấn nổi bật</h3>
<ul>
<li>[Điểm nhấn 1 — ví dụ: sân khấu hoành tráng, dàn nghệ sĩ đình đám…]</li>
<li>[Điểm nhấn 2 — ví dụ: trải nghiệm độc quyền, quà tặng hấp dẫn…]</li>
<li>[Điểm nhấn 3 — ví dụ: ưu đãi riêng cho khách đặt vé sớm…]</li>
</ul>
<h3>🗓️ Chương trình chính</h3>
<ul>
<li>[19:00] — [Đón khách &amp; check-in]</li>
<li>[19:30] — [Khai mạc / tiết mục mở màn]</li>
<li>[20:00] — [Nội dung chính của chương trình]</li>
<li>[21:30] — [Bế mạc]</li>
</ul>
<h3>🎤 Khách mời</h3>
<p>[Giới thiệu ngắn gọn về nghệ sĩ, diễn giả hoặc khách mời đặc biệt của chương trình.]</p>
<h3>🎁 Trải nghiệm đặc biệt</h3>
<p>[Mô tả những trải nghiệm dành riêng cho người tham dự: khu photobooth, hoạt động tương tác, ẩm thực, quà lưu niệm…]</p>
<h3>📌 Điều khoản &amp; Điều kiện</h3>
<ul>
<li>Vui lòng có mặt trước giờ diễn ra ít nhất 30 phút để làm thủ tục soát vé.</li>
<li>Mỗi vé chỉ có giá trị cho một lần vào cửa.</li>
<li>Vé đã mua không hoàn, không huỷ, trừ trường hợp sự kiện bị huỷ bởi Ban tổ chức.</li>
<li>Xuất trình vé điện tử (mã QR) tại cổng để được vào sự kiện.</li>
<li>[Bổ sung quy định khác của Ban tổ chức nếu có…]</li>
</ul>`

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
  // Pre-filled editable template (not a placeholder) so the organizer starts
  // from a structured scaffold and edits in place. The wizard validator still
  // rejects the *untouched* template (see wizard-validation.ts) so this
  // convenience can't be used to skip writing a real description.
  description: DESCRIPTION_TEMPLATE,
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
