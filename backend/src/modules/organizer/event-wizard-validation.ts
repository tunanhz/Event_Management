import crypto from 'crypto';
import { AppError } from '../../common/utils/AppError';
import { IEventContract } from '../event/event-wizard-fields.schema';
import {
  ContractInput,
  CreateEventInput,
  CreateTicketInput,
  PermitDocumentInput,
  ShowInput,
  UpdateEventInput,
} from './event-wizard-types';

export const SLUG_REGEX = /^[a-z0-9-]{1,80}$/;
const PERMIT_EXTENSIONS = ['pdf', 'docx', 'png'];
const PERMIT_MAX_KB = 15 * 1024; // 15MB per SRS
// Documents must come from our own upload endpoint — blocks javascript:/external
// URLs that would otherwise be rendered as links in the admin moderation UI.
// Two shapes are accepted because the upload endpoint has two backing stores:
// an absolute Vercel Blob URL (production) and a local `/uploads/...` path (dev
// machines with no Blob token). The Blob host is pinned rather than allowing
// any https origin, so an attacker-supplied link is still rejected.
function uploadedUrlRegex(subdir: string, extensions: string): RegExp {
  return new RegExp(
    `^(?:\\/uploads\\/${subdir}\\/` +
      `|https:\\/\\/[a-z0-9-]+\\.public\\.blob\\.vercel-storage\\.com\\/${subdir}\\/)` +
      `[A-Za-z0-9._-]+\\.(?:${extensions})$`,
    'i'
  );
}

const PERMIT_URL_REGEX = uploadedUrlRegex('permits', 'pdf|docx|png');
const SIGNATURE_URL_REGEX = uploadedUrlRegex('signatures', 'png');
const LIMITS = { orgName: 80, orgInfo: 500, confirmationMessage: 500, contractRepName: 80, description: 2000 };

/** Plain-text length of the rich-text description (tags/entities stripped), so
 *  the character cap counts what the organizer actually wrote, not the HTML
 *  markup. Mirrors the frontend's htmlText() so both sides agree on the count. */
function plainTextLength(html: string): number {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * Ticket sales must close this far ahead of the show starting, so the gate has
 * a settled attendee list to check in against (no walk-up sales mid-check-in).
 */
export const TICKET_SALE_END_LEAD_MS = 30 * 60 * 1000;

/** Ticket price must stay strictly under 1 tỷ VND (exclusive upper bound). */
const TICKET_PRICE_MAX = 1_000_000_000;

/** Latest `saleEnd` allowed for a tier selling into a show that starts at
 *  `showStart` — 30 minutes before the doors, per the organizer rule. */
export function ticketSaleEndCap(showStart: Date): Date {
  return new Date(showStart.getTime() - TICKET_SALE_END_LEAD_MS);
}

/**
 * @param showStart The show (or event, for the legacy flat payload) *start*
 *   time this ticket sells into. Selling must stop 30 minutes before it, so
 *   `saleEnd` may not land after `showStart - 30m`. Undefined when the caller
 *   has no start time to check against yet.
 */
export function validateTicketInput(ticket: CreateTicketInput, showStart?: Date): void {
  if (!ticket.ticketName) {
    throw new AppError('ticketName là bắt buộc cho mỗi loại vé', 400);
  }
  if (typeof ticket.price !== 'number' || ticket.price < 0) {
    throw new AppError('price của vé phải là số >= 0', 400);
  }
  if (ticket.price >= TICKET_PRICE_MAX) {
    throw new AppError('Giá vé phải dưới 1.000.000.000đ (1 tỷ)', 400);
  }
  if (typeof ticket.quantity !== 'number' || ticket.quantity < 1) {
    throw new AppError('quantity của vé phải >= 1', 400);
  }
  const minPerOrder = ticket.minPerOrder ?? 1;
  const maxPerOrder = ticket.maxPerOrder ?? 10;
  if (typeof minPerOrder !== 'number' || minPerOrder < 1) {
    throw new AppError('minPerOrder của vé phải >= 1', 400);
  }
  if (typeof maxPerOrder !== 'number' || maxPerOrder < minPerOrder) {
    throw new AppError('maxPerOrder của vé phải >= minPerOrder', 400);
  }
  if (ticket.saleStart) {
    const start = new Date(ticket.saleStart);
    // A draft isn't public yet, so selling can only begin from now on — reject
    // a sale window that starts in the past. (Only DRAFT/REJECTED events reach
    // this validator, so a past saleStart is always stale, never live sales.)
    if (!Number.isNaN(start.getTime()) && start.getTime() <= Date.now()) {
      throw new AppError('Thời gian bắt đầu bán vé phải ở tương lai', 400);
    }
  }
  if (ticket.saleStart && ticket.saleEnd) {
    const start = new Date(ticket.saleStart);
    const end = new Date(ticket.saleEnd);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
      throw new AppError('saleEnd phải sau saleStart', 400);
    }
  }
  if (ticket.saleEnd && showStart && !Number.isNaN(showStart.getTime())) {
    const end = new Date(ticket.saleEnd);
    const cap = ticketSaleEndCap(showStart);
    if (!Number.isNaN(end.getTime()) && end.getTime() > cap.getTime()) {
      throw new AppError(
        'Thời gian kết thúc bán vé phải trước thời điểm bắt đầu sự kiện/suất diễn ít nhất 30 phút',
        400
      );
    }
  }
  if (ticket.status && ticket.status !== 'ACTIVE' && ticket.status !== 'HIDDEN') {
    throw new AppError('status của vé chỉ có thể là ACTIVE hoặc HIDDEN', 400);
  }
}

/** Shared by validateWizardFields (full wizard payload) and the dedicated
 *  permit submission endpoint (EM-136) so both enforce identical rules. */
export function validatePermitDocuments(docs: PermitDocumentInput[]): void {
  if (!Array.isArray(docs)) {
    throw new AppError('permitDocuments phải là mảng tài liệu', 400);
  }
  for (const doc of docs) {
    if (!doc || typeof doc.name !== 'string' || !doc.name.trim() || typeof doc.url !== 'string' || !doc.url.trim()) {
      throw new AppError('Mỗi tài liệu giấy phép cần name và url', 400);
    }
    const ext = (doc.name.split('.').pop() || '').toLowerCase();
    if (!PERMIT_EXTENSIONS.includes(ext)) {
      throw new AppError('Tài liệu giấy phép chỉ chấp nhận PDF/DOCX/PNG', 400);
    }
    if (!PERMIT_URL_REGEX.test(doc.url)) {
      throw new AppError(
        'url tài liệu phải là đường dẫn trả về từ API upload (/uploads/permits/...)',
        400
      );
    }
    if (doc.sizeKb !== undefined && (typeof doc.sizeKb !== 'number' || doc.sizeKb > PERMIT_MAX_KB)) {
      throw new AppError('Tài liệu giấy phép tối đa 15MB', 400);
    }
  }
}

interface ShowTimes {
  _id?: string;
  title?: string;
  startTime: Date;
  endTime: Date;
}

const SHOW_TITLE_MAX_LENGTH = 100;

/** Parse + validate one show's time range (future start, end not before start). */
function parseShowTimes(show: ShowInput, index: number): ShowTimes {
  const startTime = new Date(show.startTime);
  const endTime = new Date(show.endTime);
  const label = `suất diễn #${index + 1}`;
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new AppError(`startTime/endTime của ${label} không hợp lệ`, 400);
  }
  if (startTime.getTime() <= Date.now()) {
    throw new AppError(`Thời gian bắt đầu của ${label} phải ở tương lai`, 400);
  }
  if (endTime.getTime() <= startTime.getTime()) {
    throw new AppError(`Thời gian kết thúc của ${label} phải sau thời gian bắt đầu`, 400);
  }
  if (show.title !== undefined && typeof show.title !== 'string') {
    throw new AppError(`title của ${label} phải là chuỗi`, 400);
  }
  const title = typeof show.title === 'string' ? show.title.trim() : undefined;
  if (title && title.length > SHOW_TITLE_MAX_LENGTH) {
    throw new AppError(`Tên của ${label} tối đa ${SHOW_TITLE_MAX_LENGTH} ký tự`, 400);
  }
  return { _id: show._id, title: title || undefined, startTime, endTime };
}

/** Validate show rows (used by update, where tickets ride separately) and
 *  derive the event-level date range as min/max across shows. */
export function resolveShowTimes(shows: ShowInput[]): {
  rows: ShowTimes[];
  startDate: Date;
  endDate: Date;
} {
  if (!Array.isArray(shows) || shows.length === 0) {
    throw new AppError('Cần ít nhất 1 suất diễn', 400);
  }
  const rows = shows.map((s, i) => parseShowTimes(s, i));
  const startDate = new Date(Math.min(...rows.map((r) => r.startTime.getTime())));
  const endDate = new Date(Math.max(...rows.map((r) => r.endTime.getTime())));
  return { rows, startDate, endDate };
}

export interface ResolvedCreateSchedule {
  /** Empty for the legacy flat payload (event carries no shows). */
  shows: { title?: string; startTime: Date; endTime: Date; tickets: CreateTicketInput[] }[];
  /** Flat tier list for the legacy payload; empty when shows are used. */
  flatTickets: CreateTicketInput[];
  startDate: Date;
  endDate: Date;
}

/**
 * Normalize the create payload's schedule + tickets from either shape:
 * canonical `shows[]` (tiers nested per show) or legacy `startDate/endDate`
 * + top-level `tickets[]`. Guarantees ≥ 1 valid ticket tier overall.
 */
export function resolveCreateSchedule(input: CreateEventInput): ResolvedCreateSchedule {
  if (Array.isArray(input.shows) && input.shows.length > 0) {
    const { rows, startDate, endDate } = resolveShowTimes(input.shows);
    const shows = rows.map((r, i) => ({
      title: r.title,
      startTime: r.startTime,
      endTime: r.endTime,
      tickets: input.shows![i].tickets ?? [],
    }));
    const allTickets = shows.flatMap((s) => s.tickets);
    if (allTickets.length === 0) {
      throw new AppError('Cần cấu hình ít nhất 1 loại vé', 400);
    }
    // Each tier closes 30m before *its own* show — a later show keeps selling
    // after an earlier one has already started.
    shows.forEach((s) => s.tickets.forEach((t) => validateTicketInput(t, s.startTime)));
    return { shows, flatTickets: [], startDate, endDate };
  }

  // Legacy flat payload
  if (!Array.isArray(input.tickets) || input.tickets.length === 0) {
    throw new AppError('Cần cấu hình ít nhất 1 loại vé', 400);
  }
  const startDate = new Date(input.startDate as any);
  const endDate = new Date(input.endDate as any);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError('startDate/endDate không hợp lệ', 400);
  }
  if (startDate.getTime() <= Date.now()) {
    throw new AppError('Ngày bắt đầu sự kiện phải ở tương lai', 400);
  }
  if (endDate.getTime() < startDate.getTime()) {
    throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
  }
  input.tickets.forEach((t) => validateTicketInput(t, startDate));
  return { shows: [], flatTickets: input.tickets, startDate, endDate };
}

/** Compose the display `location` string: explicit > online > venue parts. */
export function composeLocation(
  input: Pick<UpdateEventInput, 'location' | 'locationType' | 'venue'>
): string | undefined {
  if (typeof input.location === 'string' && input.location.trim()) {
    return input.location.trim();
  }
  if (input.locationType === 'online') return 'Online';
  const v = input.venue;
  if (v) {
    const parts = [v.name, v.street, v.ward, v.province]
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return undefined;
}

/** Cross-field checks for wizard steps 1/3/4/5 (schedule/tickets handled above). */
export function validateWizardFields(input: UpdateEventInput): void {
  if (
    input.slug !== undefined &&
    input.slug !== '' &&
    (typeof input.slug !== 'string' || !SLUG_REGEX.test(input.slug))
  ) {
    throw new AppError('slug chỉ gồm chữ thường a-z, số và dấu gạch ngang, tối đa 80 ký tự', 400);
  }
  if (input.privacy !== undefined && input.privacy !== 'public' && input.privacy !== 'private') {
    throw new AppError('privacy chỉ có thể là public hoặc private', 400);
  }
  if (
    input.locationType !== undefined &&
    input.locationType !== 'offline' &&
    input.locationType !== 'online'
  ) {
    throw new AppError('locationType chỉ có thể là offline hoặc online', 400);
  }
  if (
    typeof input.confirmationMessage === 'string' &&
    input.confirmationMessage.length > LIMITS.confirmationMessage
  ) {
    throw new AppError(`confirmationMessage tối đa ${LIMITS.confirmationMessage} ký tự`, 400);
  }
  if (typeof input.orgName === 'string' && input.orgName.length > LIMITS.orgName) {
    throw new AppError(`orgName tối đa ${LIMITS.orgName} ký tự`, 400);
  }
  if (typeof input.orgInfo === 'string' && input.orgInfo.length > LIMITS.orgInfo) {
    throw new AppError(`orgInfo tối đa ${LIMITS.orgInfo} ký tự`, 400);
  }
  if (
    typeof input.description === 'string' &&
    plainTextLength(input.description) > LIMITS.description
  ) {
    throw new AppError(`Mô tả sự kiện tối đa ${LIMITS.description} ký tự`, 400);
  }
  if (input.logisticsServices !== undefined) {
    const ok =
      Array.isArray(input.logisticsServices) &&
      input.logisticsServices.every((s) => typeof s === 'string' && s.trim());
    if (!ok) throw new AppError('logisticsServices phải là mảng mã dịch vụ (chuỗi)', 400);
  }
  if (input.permitDocuments !== undefined) {
    validatePermitDocuments(input.permitDocuments);
  }
  if (input.contract !== undefined) {
    if (
      input.contract?.repName !== undefined &&
      (typeof input.contract.repName !== 'string' ||
        input.contract.repName.length > LIMITS.contractRepName)
    ) {
      throw new AppError(`Tên người đại diện hợp đồng tối đa ${LIMITS.contractRepName} ký tự`, 400);
    }
    if (
      input.contract?.signatureUrl !== undefined &&
      input.contract.signatureUrl !== '' &&
      (typeof input.contract.signatureUrl !== 'string' ||
        !SIGNATURE_URL_REGEX.test(input.contract.signatureUrl))
    ) {
      throw new AppError(
        'signatureUrl phải là ảnh PNG trả về từ API upload (/uploads/signatures/...)',
        400
      );
    }
    // Signing implies agreeing: an agreed contract with a representative must
    // carry the drawn signature so the acceptance is attributable.
    if (input.contract?.agreed === true && !input.contract?.signatureUrl) {
      throw new AppError('Cần ký xác nhận (chữ ký) trước khi đồng ý hợp đồng', 400);
    }
  }
  if (input.paymentInfo !== undefined) {
    const p = input.paymentInfo;
    if (p && typeof p !== 'object') {
      throw new AppError('paymentInfo không hợp lệ', 400);
    }
    if (
      p?.accountNumber !== undefined &&
      p.accountNumber !== '' &&
      !/^\d{6,30}$/.test(String(p.accountNumber))
    ) {
      throw new AppError('Số tài khoản chỉ gồm 6–30 chữ số', 400);
    }
    if (p?.bankName !== undefined && typeof p.bankName === 'string' && p.bankName.length > 100) {
      throw new AppError('Tên ngân hàng tối đa 100 ký tự', 400);
    }
    if (
      p?.accountHolder !== undefined &&
      typeof p.accountHolder === 'string' &&
      p.accountHolder.length > 100
    ) {
      throw new AppError('Tên chủ tài khoản tối đa 100 ký tự', 400);
    }
  }
}

/**
 * Build the contract subdocument. When the organizer agrees with a drawn
 * signature we stamp `agreedAt`/`signedAt` and a SHA-256 checksum over
 * (repName|signatureUrl|signedAt). Note: this is an integrity *checksum*, not
 * a cryptographic signature — anyone with DB write access could recompute it.
 * Upgrade to an HMAC with a server-held secret if tamper-evidence against
 * insiders ever becomes a requirement.
 */
export function buildContractSubdoc(contract: ContractInput): IEventContract {
  const agreed = contract.agreed === true;
  const now = agreed ? new Date() : undefined;
  const signatureUrl = contract.signatureUrl || undefined;
  return {
    repName: contract.repName,
    agreed,
    agreedAt: now,
    signatureUrl,
    signedAt: agreed && signatureUrl ? now : undefined,
    signatureHash:
      agreed && signatureUrl && now
        ? crypto
            .createHash('sha256')
            .update(`${contract.repName ?? ''}|${signatureUrl}|${now.toISOString()}`)
            .digest('hex')
        : undefined,
  };
}
