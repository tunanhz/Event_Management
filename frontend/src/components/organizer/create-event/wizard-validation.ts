/**
 * Per-step validation for the create-event wizard. Each step must be fully
 * valid before the organizer can advance (or save) — this is what enforces
 * "hoàn tất bước trước mới sang bước sau" and stops half-empty submissions.
 *
 * `validateStep` returns the list of human-readable errors for one step
 * (empty ⇒ valid). `firstInvalidStep` finds the earliest incomplete step,
 * used to gate forward tab navigation and the final save.
 */
import { DESCRIPTION_TEMPLATE, LIMITS, SETTINGS_LIMITS, TICKET_LIMITS, saleEndCapFor, type CreateEventForm, type EventShow, type WizardStep } from "./create-event-data"

/** Plain-text length of rich-text HTML (strips tags + entities). */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const isBlank = (s: string) => s.trim().length === 0
const isHttpUrl = (s: string) => /^https?:\/\/.+/i.test(s.trim())

/** Step-1 fields that map 1:1 to a single input, for inline (per-field) errors.
 *  Images and the rich-text description aren't simple inputs, so they stay in
 *  the step-level summary only. */
export type Step1FieldKey =
  | "name"
  | "venueName"
  | "province"
  | "ward"
  | "street"
  | "category"
  | "orgName"
  | "orgInfo"

/** Per-field errors for step 1 — single source of truth for both the inline
 *  messages (EventBasicInfo / OrganizerInfo) and the step-level summary. */
export function fieldErrors(f: CreateEventForm): Partial<Record<Step1FieldKey, string>> {
  const e: Partial<Record<Step1FieldKey, string>> = {}

  if (isBlank(f.name)) e.name = "Vui lòng nhập tên sự kiện."
  else if (f.name.length > LIMITS.name) e.name = `Tên sự kiện tối đa ${LIMITS.name} ký tự.`

  if (f.locationType === "offline") {
    if (isBlank(f.venueName)) e.venueName = "Vui lòng nhập tên địa điểm."
    if (isBlank(f.province)) e.province = "Vui lòng chọn Tỉnh/Thành."
    if (isBlank(f.ward)) e.ward = "Vui lòng chọn Phường/Xã."
    if (isBlank(f.street)) e.street = "Vui lòng nhập số nhà, đường."
  } else {
    if (isBlank(f.street)) e.street = "Vui lòng nhập link tham gia sự kiện online."
    else if (!isHttpUrl(f.street)) e.street = "Link tham gia phải là URL hợp lệ (bắt đầu http/https)."
  }

  if (isBlank(f.category)) e.category = "Vui lòng chọn thể loại sự kiện."

  if (isBlank(f.orgName)) e.orgName = "Vui lòng nhập tên ban tổ chức."
  else if (f.orgName.length > LIMITS.orgName) e.orgName = `Tên ban tổ chức tối đa ${LIMITS.orgName} ký tự.`
  if (isBlank(f.orgInfo)) e.orgInfo = "Vui lòng nhập thông tin ban tổ chức."
  else if (f.orgInfo.length > LIMITS.orgInfo) e.orgInfo = `Thông tin ban tổ chức tối đa ${LIMITS.orgInfo} ký tự.`

  return e
}

/** Step 1 — event info, address, organizer identity, images. Builds on
 *  fieldErrors() (kept in field order) plus the image + description checks. */
function validateStep1(f: CreateEventForm): string[] {
  const e: string[] = []
  const fe = fieldErrors(f)
  if (!f.bannerImage) e.push("Vui lòng tải ảnh nền sự kiện (1280x720).")
  if (!f.posterImage) e.push("Vui lòng tải ảnh sự kiện hiển thị (720x958).")

  const push = (key: Step1FieldKey) => fe[key] && e.push(fe[key] as string)
  push("name")
  push("venueName")
  push("province")
  push("ward")
  push("street")
  push("category")
  const descText = htmlText(f.description)
  if (descText.length < 10)
    e.push("Vui lòng nhập mô tả sự kiện (tối thiểu 10 ký tự).")
  else if (descText === htmlText(DESCRIPTION_TEMPLATE))
    e.push("Vui lòng thay nội dung mẫu bằng mô tả thực tế cho sự kiện của bạn.")
  else if (descText.length > LIMITS.description)
    e.push(`Mô tả sự kiện tối đa ${LIMITS.description} ký tự.`)
  push("orgName")
  push("orgInfo")
  return e
}

/** Step-2 fields that map to a single control per show, for inline errors.
 *  (Individual ticket tiers validate inside the ticket modal.) */
export type ShowFieldKey = "startTime" | "endTime" | "tickets"

/**
 * Inline per-field errors for one show (step 2) — single source of truth for
 * both the inline messages (EventShowCard) and the step-level summary.
 * `prev` is the preceding show in list order, used for the "must start after
 * the previous show ends" rule (surfaced on this show's start time so no two
 * suất diễn overlap; back-to-back, i.e. next start == previous end, is allowed).
 * A draft isn't public yet, so the start must also be in the future.
 */
export function showFieldErrors(
  show: EventShow,
  prev?: EventShow,
): Partial<Record<ShowFieldKey, string>> {
  const e: Partial<Record<ShowFieldKey, string>> = {}
  const start = show.startTime ? new Date(show.startTime).getTime() : NaN
  const end = show.endTime ? new Date(show.endTime).getTime() : NaN

  if (!show.startTime) e.startTime = "Vui lòng nhập thời gian bắt đầu."
  else if (Number.isNaN(start)) e.startTime = "Thời gian bắt đầu không hợp lệ."
  else if (start <= Date.now()) e.startTime = "Thời gian bắt đầu phải ở tương lai."

  if (!show.endTime) e.endTime = "Vui lòng nhập thời gian kết thúc."
  else if (Number.isNaN(end)) e.endTime = "Thời gian kết thúc không hợp lệ."
  else if (!Number.isNaN(start) && end <= start)
    e.endTime = "Thời gian kết thúc phải sau thời gian bắt đầu."

  if (!e.startTime && prev?.startTime && prev?.endTime) {
    const prevEnd = new Date(prev.endTime).getTime()
    if (!Number.isNaN(prevEnd) && !Number.isNaN(start) && start < prevEnd)
      e.startTime = "Phải bắt đầu sau khi suất diễn trước kết thúc — các suất không được trùng giờ."
  }

  if (show.tickets.length === 0) e.tickets = "Vui lòng tạo ít nhất 1 loại vé."
  return e
}

/** Step 2 — ≥ 1 show, each with a valid future time range and ≥ 1 ticket type.
 *  Reuses showFieldErrors() for the show-level checks, then walks each tier. */
function validateStep2(f: CreateEventForm): string[] {
  const e: string[] = []
  if (f.shows.length === 0) e.push("Vui lòng tạo ít nhất 1 suất diễn.")
  f.shows.forEach((show, i) => {
    const label = show.title.trim() || `Suất ${i + 1}`
    const fe = showFieldErrors(show, f.shows[i - 1])
    if (fe.startTime) e.push(`${label}: ${fe.startTime}`)
    if (fe.endTime) e.push(`${label}: ${fe.endTime}`)
    if (fe.tickets) e.push(`${label}: ${fe.tickets}`)
    show.tickets.forEach((t) => {
      const name = t.name || "?"
      if (isBlank(t.name)) e.push(`${label}: có loại vé chưa đặt tên.`)
      // Paid tiers must carry a real price — kept in lock-step with the ticket
      // modal, which rejects price ≤ 0 for a non-free tier.
      if (!t.isFree && (typeof t.price !== "number" || t.price <= 0))
        e.push(`Vé "${name}" (${label}): giá vé phải lớn hơn 0.`)
      else if (!t.isFree && t.price >= TICKET_LIMITS.maxPrice)
        e.push(`Vé "${name}" (${label}): giá vé phải dưới 1.000.000.000đ.`)
      if (typeof t.quantity !== "number" || t.quantity < 1)
        e.push(`Vé "${name}" (${label}): số lượng phải ≥ 1.`)
      if (t.minPerOrder < 1)
        e.push(`Vé "${name}" (${label}): số vé tối thiểu/đơn phải ≥ 1.`)
      if (t.maxPerOrder < t.minPerOrder)
        e.push(`Vé "${name}" (${label}): số vé tối đa/đơn phải ≥ tối thiểu.`)
      if (t.maxPerOrder > t.quantity)
        e.push(`Vé "${name}" (${label}): số vé tối đa/đơn không được vượt tổng số vé.`)
      // Sale can't start in the past — a draft isn't public yet, so selling
      // can only begin from now on. Catches stale saleStart values left over
      // from an earlier draft that has since become past-dated.
      if (t.saleStart && new Date(t.saleStart).getTime() <= Date.now())
        e.push(`Vé "${name}" (${label}): thời gian bắt đầu bán vé phải ở tương lai.`)
      // Sales must close 30 minutes before this show starts, so check-in opens
      // against a settled attendee list. Also catches a ticket left over from
      // before the organizer moved this show's start time earlier.
      const saleEndCap = saleEndCapFor(show.startTime)
      if (saleEndCap && t.saleEnd && t.saleEnd > saleEndCap)
        e.push(`Vé "${name}" (${label}): thời gian kết thúc bán vé phải trước giờ bắt đầu suất diễn ít nhất 30 phút.`)
    })
  })
  return e
}

/** Step-3 fields (settings). */
export type Step3FieldKey = "slug" | "confirmationMessage"

/** Per-field errors for step 3 — inline (SettingsStep) + step summary. */
export function step3FieldErrors(f: CreateEventForm): Partial<Record<Step3FieldKey, string>> {
  const e: Partial<Record<Step3FieldKey, string>> = {}
  if (isBlank(f.slug)) e.slug = "Vui lòng nhập đường dẫn tuỳ chỉnh (slug) cho sự kiện."
  else if (f.slug.length > SETTINGS_LIMITS.slug) e.slug = `Đường dẫn tối đa ${SETTINGS_LIMITS.slug} ký tự.`
  if (f.confirmationMessage.length > SETTINGS_LIMITS.confirmationMessage)
    e.confirmationMessage = `Tin nhắn xác nhận tối đa ${SETTINGS_LIMITS.confirmationMessage} ký tự.`
  return e
}

/** Step 3 — settings (custom URL slug is required). */
function validateStep3(f: CreateEventForm): string[] {
  return Object.values(step3FieldErrors(f))
}

/** Step-4 field (legal permit upload). */
export type Step4FieldKey = "permitDocuments"

/** Per-field errors for step 4 — inline (LogisticsPermitStep) + step summary. */
export function step4FieldErrors(f: CreateEventForm): Partial<Record<Step4FieldKey, string>> {
  const e: Partial<Record<Step4FieldKey, string>> = {}
  if (f.permitDocuments.length === 0)
    e.permitDocuments = "Vui lòng đính kèm ít nhất 1 giấy phép / hồ sơ pháp lý."
  return e
}

/** Step 4 — at least one legal permit / document uploaded. */
function validateStep4(f: CreateEventForm): string[] {
  return Object.values(step4FieldErrors(f))
}

/** Step-5 fields (service contract). */
export type Step5FieldKey = "contractRepName" | "signature" | "agreed"

/** Per-field errors for step 5 — inline (ContractStep) + step summary. */
export function step5FieldErrors(f: CreateEventForm): Partial<Record<Step5FieldKey, string>> {
  const e: Partial<Record<Step5FieldKey, string>> = {}
  if (isBlank(f.contractRepName)) e.contractRepName = "Vui lòng nhập người đại diện ký hợp đồng."
  if (!f.signatureDataUrl) e.signature = "Vui lòng ký tên vào hợp đồng."
  if (!f.contractAgreed) e.agreed = "Vui lòng tích đồng ý điều khoản hợp đồng."
  return e
}

/** Step 5 — signed & agreed service contract. */
function validateStep5(f: CreateEventForm): string[] {
  return Object.values(step5FieldErrors(f))
}

/** Step-6 fields (payout bank account). */
export type Step6FieldKey = "bankName" | "bankAccountNumber" | "bankAccountHolder"

/** Per-field errors for step 6 — inline (PaymentStep) + step summary. */
export function step6FieldErrors(f: CreateEventForm): Partial<Record<Step6FieldKey, string>> {
  const e: Partial<Record<Step6FieldKey, string>> = {}
  if (isBlank(f.bankName)) e.bankName = "Vui lòng chọn ngân hàng nhận tiền."
  if (isBlank(f.bankAccountNumber)) e.bankAccountNumber = "Vui lòng nhập số tài khoản."
  else if (!/^\d{6,30}$/.test(f.bankAccountNumber)) e.bankAccountNumber = "Số tài khoản chỉ gồm 6–30 chữ số."
  if (isBlank(f.bankAccountHolder)) e.bankAccountHolder = "Vui lòng nhập tên chủ tài khoản."
  return e
}

/** Step 6 — payout bank account. */
function validateStep6(f: CreateEventForm): string[] {
  return Object.values(step6FieldErrors(f))
}

const VALIDATORS: Record<WizardStep, (f: CreateEventForm) => string[]> = {
  1: validateStep1,
  2: validateStep2,
  3: validateStep3,
  4: validateStep4,
  5: validateStep5,
  6: validateStep6,
}

/** Errors for one step (empty ⇒ that step is complete). */
export function validateStep(step: WizardStep, form: CreateEventForm): string[] {
  return VALIDATORS[step](form)
}

/** The earliest incomplete step (1..6), or null when every step is valid. */
export function firstInvalidStep(form: CreateEventForm): WizardStep | null {
  for (let s = 1 as WizardStep; s <= 6; s = (s + 1) as WizardStep) {
    if (VALIDATORS[s](form).length > 0) return s
  }
  return null
}
