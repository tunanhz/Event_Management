/**
 * Per-step validation for the create-event wizard. Each step must be fully
 * valid before the organizer can advance (or save) — this is what enforces
 * "hoàn tất bước trước mới sang bước sau" and stops half-empty submissions.
 *
 * `validateStep` returns the list of human-readable errors for one step
 * (empty ⇒ valid). `firstInvalidStep` finds the earliest incomplete step,
 * used to gate forward tab navigation and the final save.
 */
import { DESCRIPTION_TEMPLATE, LIMITS, SETTINGS_LIMITS, type CreateEventForm, type WizardStep } from "./create-event-data"

/** Plain-text length of rich-text HTML (strips tags + entities). */
function htmlText(html: string): string {
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
  push("orgName")
  push("orgInfo")
  return e
}

/** Step 2 — ≥ 1 show, each with a valid future time range and ≥ 1 ticket type. */
function validateStep2(f: CreateEventForm): string[] {
  const e: string[] = []
  if (f.shows.length === 0) e.push("Vui lòng tạo ít nhất 1 suất diễn.")
  f.shows.forEach((show, i) => {
    const label = show.title.trim() || `Suất ${i + 1}`
    if (!show.startTime || !show.endTime) {
      e.push(`${label}: vui lòng nhập thời gian bắt đầu và kết thúc.`)
    } else {
      const start = new Date(show.startTime).getTime()
      const end = new Date(show.endTime).getTime()
      if (Number.isNaN(start) || Number.isNaN(end)) e.push(`${label}: thời gian không hợp lệ.`)
      else {
        if (start <= Date.now()) e.push(`${label}: thời gian bắt đầu phải ở tương lai.`)
        if (end <= start) e.push(`${label}: thời gian kết thúc phải sau thời gian bắt đầu.`)
      }
    }
    if (show.tickets.length === 0) e.push(`${label}: vui lòng tạo ít nhất 1 loại vé.`)
    show.tickets.forEach((t) => {
      if (isBlank(t.name)) e.push(`${label}: có loại vé chưa đặt tên.`)
      if (!t.isFree && (typeof t.price !== "number" || t.price < 0))
        e.push(`Vé "${t.name || "?"}" (${label}): giá phải ≥ 0.`)
      if (typeof t.quantity !== "number" || t.quantity < 1)
        e.push(`Vé "${t.name || "?"}" (${label}): số lượng phải ≥ 1.`)
      if (t.maxPerOrder < t.minPerOrder)
        e.push(`Vé "${t.name || "?"}" (${label}): số vé tối đa/đơn phải ≥ tối thiểu.`)
      // Sale can't start in the past — a draft isn't public yet, so selling
      // can only begin from now on. Catches stale saleStart values left over
      // from an earlier draft that has since become past-dated.
      if (t.saleStart && new Date(t.saleStart).getTime() <= Date.now())
        e.push(`Vé "${t.name || "?"}" (${label}): thời gian bắt đầu bán vé phải ở tương lai.`)
      // Sales may run right up to the show's end (multi-day events sell through,
      // even after they've started) — just never past it. Also catches a ticket
      // left over from before the organizer shortened this show's end time.
      if (show.endTime && t.saleEnd && t.saleEnd > show.endTime)
        e.push(`Vé "${t.name || "?"}" (${label}): thời gian kết thúc bán vé không được sau thời gian kết thúc suất diễn.`)
    })
  })

  // Shows must run sequentially — each one may only start after the previous
  // has ended, so no two suất diễn share or overlap a time slot. Compared in
  // list order so the "Suất N" numbering stays chronological (back-to-back,
  // i.e. next start == previous end, is allowed).
  for (let i = 1; i < f.shows.length; i++) {
    const prev = f.shows[i - 1]
    const cur = f.shows[i]
    if (!prev.startTime || !prev.endTime || !cur.startTime || !cur.endTime) continue
    const prevEnd = new Date(prev.endTime).getTime()
    const curStart = new Date(cur.startTime).getTime()
    if (Number.isNaN(prevEnd) || Number.isNaN(curStart)) continue
    if (curStart < prevEnd) {
      const prevLabel = prev.title.trim() || `Suất ${i}`
      const curLabel = cur.title.trim() || `Suất ${i + 1}`
      e.push(`${curLabel}: phải bắt đầu sau khi ${prevLabel} kết thúc — các suất diễn không được trùng giờ.`)
    }
  }

  return e
}

/** Step 3 — settings (custom URL slug is required). */
function validateStep3(f: CreateEventForm): string[] {
  const e: string[] = []
  if (isBlank(f.slug)) e.push("Vui lòng nhập đường dẫn tuỳ chỉnh (slug) cho sự kiện.")
  else if (f.slug.length > SETTINGS_LIMITS.slug) e.push(`Đường dẫn tối đa ${SETTINGS_LIMITS.slug} ký tự.`)
  if (f.confirmationMessage.length > SETTINGS_LIMITS.confirmationMessage)
    e.push(`Tin nhắn xác nhận tối đa ${SETTINGS_LIMITS.confirmationMessage} ký tự.`)
  return e
}

/** Step 4 — at least one legal permit / document uploaded. */
function validateStep4(f: CreateEventForm): string[] {
  const e: string[] = []
  if (f.permitDocuments.length === 0)
    e.push("Vui lòng đính kèm ít nhất 1 giấy phép / hồ sơ pháp lý.")
  return e
}

/** Step 5 — signed & agreed service contract. */
function validateStep5(f: CreateEventForm): string[] {
  const e: string[] = []
  if (isBlank(f.contractRepName)) e.push("Vui lòng nhập người đại diện ký hợp đồng.")
  if (!f.signatureDataUrl) e.push("Vui lòng ký tên vào hợp đồng.")
  if (!f.contractAgreed) e.push("Vui lòng tích đồng ý điều khoản hợp đồng.")
  return e
}

/** Step 6 — payout bank account. */
function validateStep6(f: CreateEventForm): string[] {
  const e: string[] = []
  if (isBlank(f.bankName)) e.push("Vui lòng chọn ngân hàng nhận tiền.")
  if (isBlank(f.bankAccountNumber)) e.push("Vui lòng nhập số tài khoản.")
  else if (!/^\d{6,30}$/.test(f.bankAccountNumber)) e.push("Số tài khoản chỉ gồm 6–30 chữ số.")
  if (isBlank(f.bankAccountHolder)) e.push("Vui lòng nhập tên chủ tài khoản.")
  return e
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
