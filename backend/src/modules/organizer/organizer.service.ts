import mongoose from 'mongoose';
import {
  OrganizerRepository,
  OrganizerEventQuery,
  EventRegistrationQuery,
} from './organizer.repository';
import { IEvent } from '../event/event.model';
import { ITicket } from './ticket.model';
import { IWithdrawal } from './withdrawal.model';
import { IRevenueReport } from './revenue-report.model';
import { IncidentReport } from '../staff/incident.model';
import { CategoryRepository } from '../category/category.repository';
import { UserRepository } from '../user/user.repository';
import { AppError } from '../../common/utils/AppError';
import { config } from '../../config';
import {
  buildEventDepositOrderInfo,
  buildEventRemainingOrderInfo,
  buildPaymentUrl,
  formatVnpayDate,
} from '../payment/vnpay.util';
import { PaginatedResult, PaginationQuery } from '../../common/types';
import {
  ConfigureTicketInput,
  CreateEventInput,
  CreateTicketInput,
  PermitDocumentInput,
  UpdateEventInput,
  UpdateTicketInput,
} from './event-wizard-types';
import {
  buildContractSubdoc,
  composeLocation,
  resolveCreateSchedule,
  resolveShowTimes,
  ResolvedCreateSchedule,
  validatePermitDocuments,
  validateTicketInput,
  validateWizardFields,
} from './event-wizard-validation';
import {
  deriveCity,
  derivePriceFields,
  deriveSessions,
  deriveTime,
} from './event-discovery-derive';

/** The authenticated user performing an organizer action. */
interface OrganizerActor {
  id: string;
  role: string;
}

/** One ticket type's stock snapshot (EM-132 inventory management). */
export interface TicketInventoryRow {
  ticketId: string;
  ticketName: string;
  price: number;
  quantity: number;
  /** Held + paid combined — the atomic counter that guards against oversell. */
  soldQuantity: number;
  /** Breakdown of soldQuantity: confirmed-paid quantity. */
  sold: number;
  /** Breakdown of soldQuantity: quantity under an active (not-yet-expired) hold. */
  held: number;
  available: number;
  status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  soldPct: number;
}

/** Stock-only edit (EM-132): unlike configureTickets/updateTicket this is not
 *  gated to DRAFT/REJECTED — organizers must be able to restock or pause a
 *  ticket type while the event is already PUBLISHED and on sale. */
export interface AdjustTicketInventoryInput {
  quantity?: number;
  status?: 'ACTIVE' | 'HIDDEN';
}

/** Minimum single withdrawal per platform policy (mirrored by the FE form). */
export const MIN_WITHDRAWAL_VND = 500_000;

/** One order row on the organizer "Đơn hàng" / check-in screens. */
export interface AttendeeRow {
  registrationId: string;
  /** Short human-readable order code derived from the registration id. */
  orderCode: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  ticketName: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  registerDate: Date;
  status: string;
  checkedIn: boolean;
  checkInTime?: Date;
  checkInNote?: string;
}

/**
 * Check-in attendance report for one event. Entry-only by design: there is
 * no per-show breakdown (check-in is tracked once for the whole event) and
 * no exit/checkout concept (a checked-in ticket stays checked in — re-entry
 * after leaving is not tracked).
 */
export interface CheckInReport {
  stats: {
    paidTickets: number;
    checkedInTickets: number;
    /** checkedInTickets / paidTickets, percent 0-100. */
    rate: number;
  };
  byTicket: { ticketName: string; price: number; sold: number; checkedIn: number }[];
}

/** One staff member assigned to the event ("Thành viên" view). */
export interface EventMemberRow {
  id: string;
  staffName: string;
  staffEmail: string;
  avatar?: string;
  roleInEvent: string;
  status: string;
  assignedAt: Date;
}

/** One point on the summary sales chart — real PAID sales in a time bucket. */
export interface SalesSeriesPoint {
  label: string;
  revenue: number;
  tickets: number;
}

/** Sales analytics snapshot derived from PAID registrations. */
export interface EventAnalytics {
  totalRevenue: number;
  soldTickets: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  revenueByDay: { date: string; revenue: number; tickets: number }[];
  salesByTicket: {
    ticketId: string;
    ticketName: string;
    price: number;
    quantity: number;
    sold: number;
    revenue: number;
  }[];
}

/** Balance + history payload backing the withdrawal screen. */
export interface WithdrawalOverview {
  totalRevenue: number;
  /** PENDING + APPROVED amounts already deducted from the balance. */
  heldOrPaidOut: number;
  availableBalance: number;
  eventEnded: boolean;
  minWithdrawal: number;
  history: IWithdrawal[];
}

export interface CreateWithdrawalInput {
  amount?: unknown;
  bankName?: unknown;
  accountNumber?: unknown;
  accountHolder?: unknown;
  note?: unknown;
}

export interface GenerateReportInput {
  eventId?: unknown;
  reportName?: unknown;
  fromDate?: unknown;
  toDate?: unknown;
}

export class OrganizerService {
  private organizerRepository: OrganizerRepository;
  private categoryRepository: CategoryRepository;
  private userRepository: UserRepository;

  constructor() {
    this.organizerRepository = new OrganizerRepository();
    this.categoryRepository = new CategoryRepository();
    this.userRepository = new UserRepository();
  }

  async createEventWithTickets(
    data: CreateEventInput,
    organizerId: string
  ): Promise<{ event: IEvent; tickets: ITicket[] }> {
    const { title, description, banner, categoryId, capacity } = data ?? {};
    const location = composeLocation(data ?? {});
    if (!title || !description || !location || !banner || !categoryId || !capacity) {
      throw new AppError(
        'title, description, location (hoặc venue), banner, categoryId và capacity là bắt buộc',
        400
      );
    }
    if (typeof capacity !== 'number' || capacity < 1) {
      throw new AppError('capacity phải >= 1', 400);
    }
    validateWizardFields(data);
    // Handles both payload shapes: shows[] with nested tiers, or legacy flat
    // startDate/endDate + tickets[]. Guarantees ≥ 1 valid tier overall.
    const schedule = resolveCreateSchedule(data);

    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new AppError('Category không tồn tại', 400);
    }

    const creator = await this.userRepository.findById(organizerId);
    if (!creator) {
      throw new AppError('Không tìm thấy tài khoản tổ chức', 404);
    }

    const slug = data.slug ? data.slug.toLowerCase() : undefined;
    if (slug && (await this.organizerRepository.slugExists(slug))) {
      throw new AppError('Đường dẫn tuỳ chỉnh (slug) đã được sử dụng', 400);
    }

    const event = await this.createEventDoc(data, {
      location,
      slug,
      orgName: data.orgName?.trim() || creator.fullName,
      category: { name: category.name, slug: category.slug },
      schedule,
      organizerId,
    });

    const createdTickets: ITicket[] = [];
    try {
      if (schedule.shows.length > 0) {
        // Saved shows keep input order, so index i maps to its embedded _id.
        for (let i = 0; i < schedule.shows.length; i += 1) {
          const showId = event.shows[i]._id as mongoose.Types.ObjectId;
          for (const ticket of schedule.shows[i].tickets) {
            createdTickets.push(
              await this.organizerRepository.createTicket(
                this.buildTicketDoc(event._id as mongoose.Types.ObjectId, ticket, showId)
              )
            );
          }
        }
      } else {
        for (const ticket of schedule.flatTickets) {
          createdTickets.push(
            await this.organizerRepository.createTicket(
              this.buildTicketDoc(event._id as mongoose.Types.ObjectId, ticket)
            )
          );
        }
      }
    } catch (err) {
      // Best-effort rollback: no multi-document transaction (local dev Mongo may
      // not be a replica set), so clean up manually on partial ticket failure.
      await Promise.all(createdTickets.map((t) => t.deleteOne()));
      await this.organizerRepository.deleteEvent((event._id as mongoose.Types.ObjectId).toString());
      throw err;
    }

    return { event, tickets: createdTickets };
  }

  // Assembles the full event document (wizard fields + legacy mirror fields) and
  // translates a slug unique-index race into a friendly 400.
  private async createEventDoc(
    data: CreateEventInput,
    ctx: {
      location: string;
      slug?: string;
      orgName: string;
      category: { name: string; slug: string };
      schedule: ResolvedCreateSchedule;
      organizerId: string;
    }
  ): Promise<IEvent> {
    // Derive the public discovery fields the wizard doesn't ask for directly.
    const allTickets =
      ctx.schedule.shows.length > 0
        ? ctx.schedule.shows.flatMap((s) => s.tickets)
        : ctx.schedule.flatTickets;
    const { priceFrom, isFree } = derivePriceFields(allTickets);
    const sessions = deriveSessions(ctx.schedule.shows, ctx.schedule.startDate);
    try {
      return await this.organizerRepository.createEvent({
        title: data.title,
        description: data.description,
        location: ctx.location,
        banner: data.banner,
        categoryId: new mongoose.Types.ObjectId(data.categoryId),
        creatorId: new mongoose.Types.ObjectId(ctx.organizerId),
        startDate: ctx.schedule.startDate,
        endDate: ctx.schedule.endDate,
        capacity: data.capacity,
        reviewStatus: 'DRAFT',

        // Denormalized public "discovery" fields derived from the wizard input
        // (homepage/listing cards + detail). city from venue, time/sessions from
        // show times, priceFrom/isFree from ticket tiers.
        city: deriveCity(data.venue?.province),
        time: deriveTime(ctx.schedule.startDate),
        sessions,
        priceFrom,
        isFree,

        // ── Wizard fields ──
        posterImage: data.posterImage,
        locationType: data.locationType,
        venue: data.venue,
        shows: ctx.schedule.shows.map((s) => ({ title: s.title, startTime: s.startTime, endTime: s.endTime })),
        slug: ctx.slug,
        privacy: data.privacy ?? 'public',
        confirmationMessage: data.confirmationMessage,
        logisticsServices: data.logisticsServices ?? [],
        permitDocuments: (data.permitDocuments ?? []).map((d) => ({
          name: d.name,
          url: d.url,
          sizeKb: d.sizeKb,
        })),
        contract: data.contract ? buildContractSubdoc(data.contract) : undefined,
        paymentInfo: data.paymentInfo,

        // Legacy fields mirrored so existing public listing/detail (event module,
        // untouched by this feature) keep working once this event is published.
        date: ctx.schedule.startDate,
        maxAttendees: data.capacity,
        imageUrl: data.banner,
        organizer: ctx.orgName,
        organizerLogoUrl: data.orgLogo,
        organizerDescription: data.orgInfo,
        organizerId: new mongoose.Types.ObjectId(ctx.organizerId),
        category: ctx.category.name,
        categorySlug: ctx.category.slug,
        status: 'draft',
      });
    } catch (err: any) {
      if (err?.code === 11000 && err?.keyPattern?.slug) {
        throw new AppError('Đường dẫn tuỳ chỉnh (slug) đã được sử dụng', 400);
      }
      throw err;
    }
  }

  /** Maps one tier input to a Ticket document (defaults min/max per order). */
  private buildTicketDoc(
    eventId: mongoose.Types.ObjectId,
    ticket: CreateTicketInput,
    showId?: mongoose.Types.ObjectId
  ): Partial<ITicket> {
    const doc: Partial<ITicket> = {
      eventId,
      ticketName: ticket.ticketName,
      description: ticket.description,
      price: ticket.price,
      quantity: ticket.quantity,
      minPerOrder: ticket.minPerOrder ?? 1,
      maxPerOrder: ticket.maxPerOrder ?? 10,
      image: ticket.image,
      saleStart: ticket.saleStart ? new Date(ticket.saleStart) : undefined,
      saleEnd: ticket.saleEnd ? new Date(ticket.saleEnd) : undefined,
      status: ticket.status,
    };
    if (showId) doc.showId = showId;
    return doc;
  }

  async updateEvent(
    eventId: string,
    actor: OrganizerActor,
    data: UpdateEventInput
  ): Promise<IEvent> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'sửa sự kiện');
    validateWizardFields(data);

    const capacity = data.capacity ?? event.capacity ?? event.maxAttendees;
    if (typeof capacity !== 'number' || capacity < 1) {
      throw new AppError('capacity phải >= 1', 400);
    }

    const update: Partial<IEvent> = { capacity, maxAttendees: capacity };

    // Schedule: an explicit `shows` list wins (kept for any legacy caller);
    // otherwise a direct startDate/endDate edit is the normal path now — the
    // Event model only ever has one time range (per the ERD), so if this event
    // still carries a per-show schedule from the old wizard, the direct edit
    // retires it: shows are cleared and tickets drop their now-dangling showId
    // (clearTicketShowIds below) instead of being rejected.
    let collapseShows = false;
    if (data.shows !== undefined) {
      update.shows = await this.resolveShowReplacement(event, data.shows);
      const { startDate, endDate } = resolveShowTimes(data.shows);
      update.startDate = startDate;
      update.endDate = endDate;
    } else {
      const startDate = new Date(data.startDate ?? event.startDate ?? event.date);
      const endDate = new Date(data.endDate ?? event.endDate ?? event.date);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new AppError('startDate/endDate không hợp lệ', 400);
      }
      if (startDate.getTime() <= Date.now()) {
        throw new AppError('Ngày bắt đầu sự kiện phải ở tương lai', 400);
      }
      if (endDate.getTime() < startDate.getTime()) {
        throw new AppError('Ngày kết thúc phải sau ngày bắt đầu', 400);
      }
      update.startDate = startDate;
      update.endDate = endDate;
      if (event.shows.length > 0 && (data.startDate !== undefined || data.endDate !== undefined)) {
        update.shows = [];
        collapseShows = true;
      }
    }
    update.date = update.startDate; // legacy mirror

    // Recompute denormalized discovery fields from the (possibly new) schedule.
    const showsForSessions = update.shows ?? event.shows;
    update.time = deriveTime(update.startDate as Date);
    update.sessions = deriveSessions(showsForSessions, update.startDate as Date);

    if (data.title) update.title = data.title;
    if (data.description) update.description = data.description;
    if (data.banner) {
      update.banner = data.banner;
      update.imageUrl = data.banner;
    }
    if (data.posterImage !== undefined) update.posterImage = data.posterImage;
    if (data.locationType !== undefined) update.locationType = data.locationType;
    if (data.venue !== undefined) {
      update.venue = data.venue;
      update.city = deriveCity(data.venue?.province);
    }
    const composedLocation = composeLocation(data);
    if (composedLocation) update.location = composedLocation;

    // Organizer block maps onto the legacy display fields.
    if (data.orgName) update.organizer = data.orgName.trim();
    if (data.orgLogo !== undefined) update.organizerLogoUrl = data.orgLogo;
    if (data.orgInfo !== undefined) update.organizerDescription = data.orgInfo;

    if (data.slug) {
      const slug = data.slug.toLowerCase();
      if (slug !== event.slug && (await this.organizerRepository.slugExists(slug, eventId))) {
        throw new AppError('Đường dẫn tuỳ chỉnh (slug) đã được sử dụng', 400);
      }
      update.slug = slug;
    }
    if (data.privacy !== undefined) update.privacy = data.privacy;
    if (data.confirmationMessage !== undefined) {
      update.confirmationMessage = data.confirmationMessage;
    }
    if (data.logisticsServices !== undefined) update.logisticsServices = data.logisticsServices;
    if (data.permitDocuments !== undefined) {
      update.permitDocuments = data.permitDocuments.map((d) => ({
        name: d.name,
        url: d.url,
        sizeKb: d.sizeKb,
      }));
    }
    if (data.contract !== undefined) {
      // Re-saving a draft with the same accepted signature must not re-stamp
      // agreedAt/signedAt/signatureHash — the first acceptance is the record.
      const existing = event.contract;
      const sameAcceptance =
        existing?.agreed === true &&
        data.contract?.agreed === true &&
        (data.contract?.signatureUrl || undefined) === existing?.signatureUrl;
      update.contract = sameAcceptance ? existing : buildContractSubdoc(data.contract ?? {});
    }
    if (data.paymentInfo !== undefined) update.paymentInfo = data.paymentInfo;

    if (data.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new AppError('Category không tồn tại', 400);
      }
      update.categoryId = new mongoose.Types.ObjectId(data.categoryId);
      update.category = category.name;
      update.categorySlug = category.slug;
    }

    const updated = await this.organizerRepository.updateEditableEvent(eventId, update);
    if (!updated) {
      // reviewStatus changed between assertEditable and the atomic write
      // (e.g. a concurrent submit locked the event into the review queue).
      throw new AppError(
        'Chỉ có thể sửa sự kiện khi đang ở trạng thái nháp hoặc bị từ chối',
        400
      );
    }
    if (collapseShows) {
      await this.organizerRepository.clearTicketShowIds(eventId);
    }
    return updated;
  }

  // Replace the show list wholesale: rows with _id keep/retime an existing show,
  // rows without _id create new shows; existing shows left out are removed —
  // blocked while any ticket type still references them.
  private async resolveShowReplacement(
    event: IEvent,
    shows: NonNullable<UpdateEventInput['shows']>
  ): Promise<IEvent['shows']> {
    const { rows } = resolveShowTimes(shows);

    // First transition from a legacy flat event to shows: existing tiers carry
    // no showId and would become orphans — organizer must reconfigure them first.
    if (event.shows.length === 0) {
      const unattached = await this.organizerRepository.countTicketsWithoutShow(String(event._id));
      if (unattached > 0) {
        throw new AppError(
          'Sự kiện đang có loại vé chưa gắn suất diễn — hãy xoá các vé cũ trước khi thêm suất diễn',
          400
        );
      }
    }

    const submittedIds = rows.filter((r) => r._id).map((r) => String(r._id));
    if (new Set(submittedIds).size !== submittedIds.length) {
      throw new AppError('Danh sách suất diễn chứa _id trùng lặp', 400);
    }

    const existingIds = new Set(event.shows.map((s) => String(s._id)));
    for (const row of rows) {
      if (row._id && !existingIds.has(String(row._id))) {
        throw new AppError(`Suất diễn ${row._id} không tồn tại trong sự kiện này`, 400);
      }
    }

    const keptIds = new Set(rows.filter((r) => r._id).map((r) => String(r._id)));
    const removedIds = event.shows
      .filter((s) => !keptIds.has(String(s._id)))
      .map((s) => s._id as mongoose.Types.ObjectId);
    if (removedIds.length > 0) {
      const attached = await this.organizerRepository.countTicketsByShowIds(
        String(event._id),
        removedIds
      );
      if (attached > 0) {
        throw new AppError(
          'Không thể xoá suất diễn đang có loại vé — hãy xoá hoặc chuyển vé sang suất khác trước',
          400
        );
      }
    }

    return rows.map((r) => ({
      _id: r._id ? new mongoose.Types.ObjectId(r._id) : new mongoose.Types.ObjectId(),
      title: r.title,
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  }

  // The ticket's showId scopes its sale window to that show's end time; events
  // with no shows fall back to the event's own end date so selling can never
  // outlive the event itself.
  private resolveTicketSaleEndCap(event: IEvent, showId?: string): Date | undefined {
    if (event.shows && event.shows.length > 0 && showId) {
      const show = event.shows.find((s) => String(s._id) === String(showId));
      if (show?.endTime) return new Date(show.endTime);
    }
    const cap = event.endDate ?? event.date;
    return cap ? new Date(cap) : undefined;
  }

  async addTicket(
    eventId: string,
    actor: OrganizerActor,
    input: CreateTicketInput & { showId?: string }
  ): Promise<ITicket> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'thêm loại vé');
    validateTicketInput(input, this.resolveTicketSaleEndCap(event, input.showId));
    const showId = this.resolveTicketShowId(event, input.showId);

    const created = await this.organizerRepository.createTicket(
      this.buildTicketDoc(event._id as mongoose.Types.ObjectId, input, showId)
    );
    await this.syncPriceFields(eventId);
    return created;
  }

  // Keep the denormalized card price (priceFrom/isFree) in sync with the event's
  // current ticket tiers after any ticket mutation, so public listings show the
  // real lowest price instead of a stale/default value.
  private async syncPriceFields(eventId: string): Promise<void> {
    const tickets = await this.organizerRepository.findTicketsByEvent(eventId);
    const { priceFrom, isFree } = derivePriceFields(tickets);
    await this.organizerRepository.updateEditableEvent(eventId, { priceFrom, isFree });
  }

  // Events with shows require every tier to target one of them; legacy
  // single-show events (empty shows list) must not send a showId at all.
  private resolveTicketShowId(
    event: IEvent,
    showId?: string
  ): mongoose.Types.ObjectId | undefined {
    if (!event.shows || event.shows.length === 0) {
      if (showId) {
        throw new AppError('Sự kiện này không có suất diễn — không thể gán showId cho vé', 400);
      }
      return undefined;
    }
    if (!showId) {
      throw new AppError('Cần chỉ định showId (suất diễn) cho loại vé', 400);
    }
    const show = event.shows.find((s) => String(s._id) === String(showId));
    if (!show) {
      throw new AppError(`Suất diễn ${showId} không tồn tại trong sự kiện này`, 400);
    }
    return show._id as mongoose.Types.ObjectId;
  }

  async updateTicket(
    eventId: string,
    ticketId: string,
    actor: OrganizerActor,
    data: UpdateTicketInput
  ): Promise<ITicket> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'sửa loại vé');
    const ticket = await this.getEventTicket(eventId, ticketId);

    const merged: CreateTicketInput = {
      ticketName: data.ticketName ?? ticket.ticketName,
      description: data.description ?? ticket.description,
      price: data.price ?? ticket.price,
      quantity: data.quantity ?? ticket.quantity,
      minPerOrder: data.minPerOrder ?? ticket.minPerOrder,
      maxPerOrder: data.maxPerOrder ?? ticket.maxPerOrder,
      image: data.image ?? ticket.image,
      saleStart: data.saleStart ?? ticket.saleStart,
      saleEnd: data.saleEnd ?? ticket.saleEnd,
      status: data.status ?? (ticket.status === 'SOLD_OUT' ? undefined : ticket.status),
    };
    const effectiveShowId = data.showId ?? (ticket.showId ? String(ticket.showId) : undefined);
    validateTicketInput(merged, this.resolveTicketSaleEndCap(event, effectiveShowId));

    const ticketUpdate: Partial<ITicket> = {
      ticketName: merged.ticketName,
      description: merged.description,
      price: merged.price,
      quantity: merged.quantity,
      minPerOrder: merged.minPerOrder,
      maxPerOrder: merged.maxPerOrder,
      image: merged.image,
      saleStart: merged.saleStart ? new Date(merged.saleStart) : undefined,
      saleEnd: merged.saleEnd ? new Date(merged.saleEnd) : undefined,
      status: merged.status,
    };
    // Moving a tier between shows is validated against the event's show list.
    if (data.showId !== undefined) {
      const showId = this.resolveTicketShowId(event, data.showId);
      if (showId) ticketUpdate.showId = showId;
    }

    const updated = await this.organizerRepository.updateTicket(ticketId, ticketUpdate);
    if (!updated) {
      throw new AppError('Ticket not found', 404);
    }
    await this.syncPriceFields(eventId);
    return updated;
  }

  async deleteTicket(eventId: string, ticketId: string, actor: OrganizerActor): Promise<void> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'xoá loại vé');
    const ticket = await this.getEventTicket(eventId, ticketId);
    if (ticket.soldQuantity > 0) {
      throw new AppError('Không thể xoá loại vé đã có người mua', 400);
    }

    const ticketCount = await this.organizerRepository.countTicketsByEvent(eventId);
    if (ticketCount <= 1) {
      throw new AppError('Sự kiện cần giữ lại ít nhất 1 loại vé', 400);
    }

    await this.organizerRepository.deleteTicket(ticketId);
    await this.syncPriceFields(eventId);
  }

  async listTickets(eventId: string, actor: OrganizerActor): Promise<ITicket[]> {
    await this.getOwnedEvent(eventId, actor);
    return this.organizerRepository.findTicketsByEvent(eventId);
  }

  /**
   * Ticket type configuration (EM-128): replace an event's whole ticket-type
   * set in one call. Rows carrying `_id` are updated in place, rows without
   * one are created, and any existing ticket type left out of the submitted
   * set is removed — so the FE config screen can just POST its current table
   * instead of diffing add/update/delete calls itself.
   */
  async configureTickets(
    eventId: string,
    actor: OrganizerActor,
    tickets: ConfigureTicketInput[]
  ): Promise<ITicket[]> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'cấu hình loại vé');
    if (!Array.isArray(tickets) || tickets.length === 0) {
      throw new AppError('Cần cấu hình ít nhất 1 loại vé', 400);
    }
    for (const ticket of tickets) {
      validateTicketInput(ticket, this.resolveTicketSaleEndCap(event, ticket.showId));
      // Fails fast on rows targeting a show that doesn't belong to this event.
      this.resolveTicketShowId(event, ticket.showId);
    }

    const existing = await this.organizerRepository.findTicketsByEvent(eventId);
    const existingById = new Map(existing.map((t) => [String(t._id), t]));

    const keepIds = new Set<string>();
    for (const ticket of tickets) {
      if (ticket._id) {
        if (!existingById.has(ticket._id)) {
          throw new AppError(`Loại vé ${ticket._id} không tồn tại trong sự kiện này`, 400);
        }
        keepIds.add(ticket._id);
      }
    }

    const toRemove = existing.filter((t) => !keepIds.has(String(t._id)));
    for (const ticket of toRemove) {
      if (ticket.soldQuantity > 0) {
        throw new AppError(`Không thể xoá loại vé "${ticket.ticketName}" đã có người mua`, 400);
      }
    }

    await Promise.all(toRemove.map((t) => this.organizerRepository.deleteTicket(String(t._id))));

    const result: ITicket[] = [];
    for (const ticket of tickets) {
      const showId = this.resolveTicketShowId(event, ticket.showId);
      const payload: Partial<ITicket> = {
        ticketName: ticket.ticketName,
        description: ticket.description,
        price: ticket.price,
        quantity: ticket.quantity,
        minPerOrder: ticket.minPerOrder ?? 1,
        maxPerOrder: ticket.maxPerOrder ?? 10,
        image: ticket.image,
        saleStart: ticket.saleStart ? new Date(ticket.saleStart) : undefined,
        saleEnd: ticket.saleEnd ? new Date(ticket.saleEnd) : undefined,
        status: ticket.status,
      };
      if (showId) payload.showId = showId;
      if (ticket._id) {
        const updated = await this.organizerRepository.updateTicket(ticket._id, payload);
        if (!updated) {
          throw new AppError('Ticket not found', 404);
        }
        result.push(updated);
      } else {
        const created = await this.organizerRepository.createTicket({
          eventId: event._id as mongoose.Types.ObjectId,
          ...payload,
        });
        result.push(created);
      }
    }

    await this.syncPriceFields(eventId);
    return result;
  }

  /**
   * Ticket inventory management (EM-132): per-ticket-type stock snapshot —
   * how many are configured, currently held (pending checkout), confirmed
   * sold, and still available. Available regardless of reviewStatus (the
   * organizer must be able to check stock before and after publish).
   */
  async getTicketInventory(eventId: string, actor: OrganizerActor): Promise<TicketInventoryRow[]> {
    await this.getOwnedEvent(eventId, actor);
    const tickets = await this.organizerRepository.findTicketsByEvent(eventId);
    const breakdown = await this.organizerRepository.sumRegistrationsByTicket(
      tickets.map((t) => String(t._id))
    );

    return tickets.map((t) => {
      const b = breakdown.get(String(t._id)) ?? { sold: 0, held: 0 };
      return {
        ticketId: String(t._id),
        ticketName: t.ticketName,
        price: t.price,
        quantity: t.quantity,
        soldQuantity: t.soldQuantity,
        sold: b.sold,
        held: b.held,
        available: Math.max(0, t.quantity - t.soldQuantity),
        status: t.status,
        soldPct: t.quantity ? Math.round((t.soldQuantity / t.quantity) * 100) : 0,
      };
    });
  }

  /**
   * Restock or pause/resume a single ticket type's sales — the "manage stock
   * on a live event" counterpart to configureTickets' "set up types before
   * publish". Deliberately does not call assertEditable: this must keep
   * working once the event is PUBLISHED and selling. Only quantity/status
   * are editable here; renaming, pricing, and schedule changes stay behind
   * the DRAFT/REJECTED-only configuration endpoints. Still blocked once the
   * event has started — stock is only adjustable while tickets are on sale
   * (before the event begins), not while it's under way or over.
   */
  async adjustTicketInventory(
    eventId: string,
    ticketId: string,
    actor: OrganizerActor,
    data: AdjustTicketInventoryInput
  ): Promise<ITicket> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertNotStarted(event, 'điều chỉnh kho vé');
    const ticket = await this.getEventTicket(eventId, ticketId);

    const update: Partial<ITicket> = {};
    if (data.quantity !== undefined) {
      if (typeof data.quantity !== 'number' || !Number.isInteger(data.quantity) || data.quantity < 1) {
        throw new AppError('quantity phải là số nguyên >= 1', 400);
      }
      if (data.quantity < ticket.soldQuantity) {
        throw new AppError(
          `Không thể đặt quantity (${data.quantity}) thấp hơn số vé đã bán/đang giữ (${ticket.soldQuantity})`,
          400
        );
      }
      update.quantity = data.quantity;
    }
    if (data.status !== undefined) {
      if (data.status !== 'ACTIVE' && data.status !== 'HIDDEN') {
        throw new AppError('status chỉ có thể là ACTIVE hoặc HIDDEN', 400);
      }
      update.status = data.status;
    }
    if (Object.keys(update).length === 0) {
      throw new AppError('Cần cung cấp quantity hoặc status để cập nhật tồn kho', 400);
    }

    const updated = await this.organizerRepository.updateTicket(ticketId, update);
    if (!updated) {
      throw new AppError('Ticket not found', 404);
    }
    await this.syncPriceFields(eventId);
    return updated;
  }

  async listPermits(eventId: string, actor: OrganizerActor): Promise<IEvent['permitDocuments']> {
    const event = await this.getOwnedEvent(eventId, actor);
    return event.permitDocuments;
  }

  /**
   * Permit submission (EM-136/EM-28): replace an event's whole legal permit
   * document list in one call — same "submit the whole table" shape as
   * configureTickets. DRAFT/REJECTED-only: these are the
   * documents admin moderation reviews as part of approval, so they stay
   * locked once the event enters the review queue, same as everything else
   * assertEditable guards. An empty list is valid — permits are optional
   * (only events that requested the platform's permit-support logistics
   * service need them).
   */
  async configurePermits(
    eventId: string,
    actor: OrganizerActor,
    permitDocuments: PermitDocumentInput[]
  ): Promise<IEvent['permitDocuments']> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'cập nhật hồ sơ giấy phép');
    validatePermitDocuments(permitDocuments);

    const mapped = permitDocuments.map((d) => ({
      name: d.name,
      url: d.url,
      sizeKb: d.sizeKb,
    }));

    const updated = await this.organizerRepository.updateEditableEvent(eventId, {
      permitDocuments: mapped,
    });
    if (!updated) {
      // reviewStatus changed between assertEditable and the atomic write
      // (e.g. a concurrent submit locked the event into the review queue).
      throw new AppError(
        'Chỉ có thể cập nhật hồ sơ giấy phép khi sự kiện đang ở trạng thái nháp hoặc bị từ chối',
        400
      );
    }
    return updated.permitDocuments;
  }

  // ─── Attendee tracker / orders ("Đơn hàng") ───────────────────────────

  /**
   * Resolve a show filter to the set of ticket ids sold for that show, so
   * registration queries can be scoped per suất diễn. Returns undefined for
   * "all shows" (no filter); an empty array means the show exists but has no
   * tickets yet, which correctly matches zero registrations downstream.
   */
  private async ticketIdsForShow(
    event: IEvent,
    showId: string | undefined
  ): Promise<string[] | undefined> {
    if (!showId) return undefined;
    const show = (event.shows ?? []).find((s) => String(s._id) === String(showId));
    if (!show) {
      throw new AppError(`Suất diễn ${showId} không tồn tại trong sự kiện này`, 400);
    }
    const tickets = await this.organizerRepository.findTicketsByEvent(String(event._id));
    return tickets.filter((t) => String(t.showId ?? '') === String(showId)).map((t) => String(t._id));
  }

  /**
   * Paginated buyer list for one owned event, with check-in state joined so
   * the tracker can distinguish "đã check-in" from "chưa vào". PENDING holds
   * are excluded (repository default) — they are not confirmed attendees.
   * `showId` narrows the list to buyers of that show's ticket tiers.
   */
  async listEventRegistrations(
    eventId: string,
    actor: OrganizerActor,
    query: EventRegistrationQuery & { showId?: string }
  ): Promise<PaginatedResult<AttendeeRow>> {
    const event = await this.getOwnedEvent(eventId, actor);
    const { showId, ...rest } = query;
    const ticketIds = await this.ticketIdsForShow(event, showId);
    const result = await this.organizerRepository.findRegistrationsByEvent(eventId, {
      ...rest,
      ticketIds,
    });
    const rows = await this.joinCheckIns(result.data);
    return { data: rows, pagination: result.pagination };
  }

  // ─── Check-in attendance report ───────────────────────────────────────

  /**
   * Attendance snapshot for one owned event: every PAID registration joined
   * with its SUCCESS check-in (written by the staff check-in flow), rolled
   * up into one total plus a per-ticket-type breakdown. `showId` scopes the
   * whole report to one suất diễn; omitted = the entire event.
   */
  async getEventCheckInReport(
    eventId: string,
    actor: OrganizerActor,
    showId?: string
  ): Promise<CheckInReport> {
    const event = await this.getOwnedEvent(eventId, actor);
    const ticketIds = await this.ticketIdsForShow(event, showId);
    const paid = await this.organizerRepository.findPaidRegistrationsByEvent(eventId, ticketIds);
    const rows = await this.joinCheckIns(paid);

    const paidTickets = rows.reduce((sum, r) => sum + r.quantity, 0);
    const checkedInTickets = rows
      .filter((r) => r.checkedIn)
      .reduce((sum, r) => sum + r.quantity, 0);

    const byTicketMap = new Map<
      string,
      { ticketName: string; price: number; sold: number; checkedIn: number }
    >();
    for (const r of rows) {
      const entry = byTicketMap.get(r.ticketName) ?? {
        ticketName: r.ticketName,
        price: r.unitPrice,
        sold: 0,
        checkedIn: 0,
      };
      entry.sold += r.quantity;
      if (r.checkedIn) entry.checkedIn += r.quantity;
      byTicketMap.set(r.ticketName, entry);
    }

    return {
      stats: {
        paidTickets,
        checkedInTickets,
        rate: paidTickets ? Math.round((checkedInTickets / paidTickets) * 100) : 0,
      },
      byTicket: [...byTicketMap.values()],
    };
  }

  // ─── Members ("Thành viên") — staff assigned by ADMIN, read-only here ──

  async getEventMembers(eventId: string, actor: OrganizerActor): Promise<EventMemberRow[]> {
    await this.getOwnedEvent(eventId, actor);
    const assignments = await this.organizerRepository.findAssignmentsByEvent(eventId);
    return assignments.map((a) => {
      const staff = a.staffId as any;
      return {
        id: String(a._id),
        staffName: staff?.fullName ?? 'Không rõ',
        staffEmail: staff?.email ?? '',
        avatar: staff?.avatar,
        // Phân công mới dùng note làm nội dung nhiệm vụ; responsibility chỉ
        // được giữ lại để tương thích với những bản ghi cũ.
        roleInEvent: a.note || a.responsibility || 'Staff sự kiện',
        status: a.status,
        assignedAt: a.createdAt,
      };
    });
  }

  async getEventIncidents(eventId: string, actor: OrganizerActor): Promise<any[]> {
    await this.getOwnedEvent(eventId, actor);
    const filter: Record<string, any> = {};
    if (mongoose.isValidObjectId(eventId)) {
      filter.$or = [{ eventId: new mongoose.Types.ObjectId(eventId) }, { eventId: eventId }];
    } else {
      filter.eventId = eventId;
    }
    return IncidentReport.find(filter)
      .populate('staffId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .lean();
  }

  // ─── Analytics ("Phân tích") — real sales stats, no web tracking ──────

  async getEventAnalytics(
    eventId: string,
    actor: OrganizerActor,
    showId?: string
  ): Promise<EventAnalytics> {
    const event = await this.getOwnedEvent(eventId, actor);
    const ticketIds = await this.ticketIdsForShow(event, showId);
    const [totals, statusCounts, revenueByDay, allTickets, paidByTicket] = await Promise.all([
      this.organizerRepository.paidTotalsByEvent(eventId, undefined, undefined, ticketIds),
      this.organizerRepository.countRegistrationStatusesByEvent(eventId, ticketIds),
      this.organizerRepository.paidRevenueByDay(eventId, ticketIds),
      this.organizerRepository.findTicketsByEvent(eventId),
      this.organizerRepository.paidStatsByTicket(eventId),
    ]);
    // The per-tier table lists only the filtered show's tiers (all tiers when unfiltered).
    const tickets = ticketIds
      ? allTickets.filter((t) => ticketIds.includes(String(t._id)))
      : allTickets;

    return {
      totalRevenue: totals.revenue,
      soldTickets: totals.tickets,
      paidOrders: totals.orders,
      pendingOrders: statusCounts.PENDING ?? 0,
      cancelledOrders:
        (statusCounts.CANCELLED ?? 0) +
        (statusCounts.EXPIRED ?? 0) +
        (statusCounts.REFUNDED ?? 0),
      revenueByDay,
      salesByTicket: tickets.map((t) => {
        const paidStats = paidByTicket.get(String(t._id)) ?? { revenue: 0, tickets: 0 };
        return {
          ticketId: String(t._id),
          ticketName: t.ticketName,
          price: t.price,
          quantity: t.quantity,
          sold: paidStats.tickets,
          revenue: paidStats.revenue,
        };
      }),
    };
  }

  /**
   * Real per-bucket PAID sales for the summary chart. `range` picks the window
   * and granularity: '30d' = the last 30 local (GMT+7) days grouped by day,
   * '24h' = the last 24 hours grouped by hour. Buckets with no sales are
   * zero-filled so the x-axis stays continuous, and labels ('D/M' or 'H:00')
   * match what the chart renders. `showId` scopes to one suất diễn.
   */
  async getEventSalesSeries(
    eventId: string,
    actor: OrganizerActor,
    range: '24h' | '30d',
    showId?: string
  ): Promise<SalesSeriesPoint[]> {
    const event = await this.getOwnedEvent(eventId, actor);
    const ticketIds = await this.ticketIdsForShow(event, showId);

    const HOUR = 3_600_000;
    const DAY = 24 * HOUR;
    const VN = 7 * HOUR; // Vietnam is GMT+7 with no DST, so a fixed offset is exact.
    const pad = (n: number) => String(n).padStart(2, '0');
    // Wall-clock (GMT+7) parts of a UTC instant, via the shift-then-read-UTC trick.
    const parts = (ms: number) => {
      const d = new Date(ms + VN);
      return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), day: d.getUTCDate(), h: d.getUTCHours() };
    };

    const now = Date.now();
    const buckets: { key: string; label: string }[] = [];
    let granularity: 'day' | 'hour';
    let from: Date;

    if (range === '24h') {
      granularity = 'hour';
      const p = parts(now);
      const hourStart = Date.UTC(p.y, p.mo, p.day, p.h, 0, 0) - VN; // top of current GMT+7 hour
      for (let i = 23; i >= 0; i--) {
        const q = parts(hourStart - i * HOUR);
        buckets.push({ key: `${q.y}-${pad(q.mo + 1)}-${pad(q.day)}T${pad(q.h)}`, label: `${q.h}:00` });
      }
      from = new Date(hourStart - 23 * HOUR);
    } else {
      granularity = 'day';
      const p = parts(now);
      const dayStart = Date.UTC(p.y, p.mo, p.day, 0, 0, 0) - VN; // GMT+7 midnight today
      for (let i = 29; i >= 0; i--) {
        const q = parts(dayStart - i * DAY);
        buckets.push({ key: `${q.y}-${pad(q.mo + 1)}-${pad(q.day)}`, label: `${q.day}/${q.mo + 1}` });
      }
      from = new Date(dayStart - 29 * DAY);
    }

    const raw = await this.organizerRepository.paidSalesSeries(eventId, ticketIds, from, granularity);
    const byKey = new Map(raw.map((r) => [r.bucket, r]));
    return buckets.map((b) => {
      const hit = byKey.get(b.key);
      return { label: b.label, revenue: hit?.revenue ?? 0, tickets: hit?.tickets ?? 0 };
    });
  }

  // ─── Withdrawals ("Rút tiền") — post-event payout requests ────────────

  async getWithdrawalOverview(eventId: string, actor: OrganizerActor): Promise<WithdrawalOverview> {
    const event = await this.getOwnedEvent(eventId, actor);
    const [totals, held, history] = await Promise.all([
      this.organizerRepository.paidTotalsByEvent(eventId),
      this.organizerRepository.sumHeldWithdrawalsByEvent(eventId),
      this.organizerRepository.findWithdrawalsByEvent(eventId),
    ]);
    return {
      totalRevenue: totals.revenue,
      heldOrPaidOut: held,
      availableBalance: Math.max(0, totals.revenue - held),
      eventEnded: this.hasEventEnded(event),
      minWithdrawal: MIN_WITHDRAWAL_VND,
      history,
    };
  }

  /**
   * Create a PENDING withdrawal request. Per SRS §2.3 payouts are settled
   * after the event ends, so requests are rejected while it is still
   * upcoming/ongoing. Amount is capped by availableBalance = PAID revenue
   * minus PENDING/APPROVED requests. (Two racing requests could both read the
   * same balance — accepted for now: admin review is the final gate.)
   */
  async createWithdrawal(
    eventId: string,
    actor: OrganizerActor,
    input: CreateWithdrawalInput
  ): Promise<IWithdrawal> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'PUBLISHED') {
      throw new AppError('Chỉ có thể yêu cầu rút tiền cho sự kiện đã được công bố', 400);
    }
    if (!this.hasEventEnded(event)) {
      throw new AppError('Chỉ có thể gửi yêu cầu rút tiền sau khi sự kiện đã kết thúc', 400);
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < MIN_WITHDRAWAL_VND) {
      throw new AppError(
        `Số tiền rút tối thiểu là ${MIN_WITHDRAWAL_VND.toLocaleString('vi-VN')}đ`,
        400
      );
    }

    const bankName = typeof input.bankName === 'string' ? input.bankName.trim() : '';
    const accountNumber = typeof input.accountNumber === 'string' ? input.accountNumber.trim() : '';
    const accountHolder = typeof input.accountHolder === 'string' ? input.accountHolder.trim() : '';
    if (!bankName || !accountNumber || !accountHolder) {
      throw new AppError('Vui lòng nhập đủ ngân hàng, số tài khoản và chủ tài khoản', 400);
    }
    if (!/^\d{6,20}$/.test(accountNumber)) {
      throw new AppError('Số tài khoản chỉ gồm chữ số (6–20 ký tự)', 400);
    }

    const [totals, held] = await Promise.all([
      this.organizerRepository.paidTotalsByEvent(eventId),
      this.organizerRepository.sumHeldWithdrawalsByEvent(eventId),
    ]);
    const available = Math.max(0, totals.revenue - held);
    if (amount > available) {
      throw new AppError(
        `Số tiền vượt quá số dư khả dụng (${available.toLocaleString('vi-VN')}đ)`,
        400
      );
    }

    return this.organizerRepository.createWithdrawal({
      organizerId: (event.creatorId as mongoose.Types.ObjectId) ?? new mongoose.Types.ObjectId(actor.id),
      eventId: event._id as mongoose.Types.ObjectId,
      amount,
      requestDate: new Date(),
      status: 'PENDING',
      bankName,
      accountNumber,
      accountHolder,
      note: typeof input.note === 'string' ? input.note.trim() || undefined : undefined,
    });
  }

  // ─── Revenue reports ("Quản lý báo cáo") ──────────────────────────────

  /**
   * Generate a revenue report for one owned event. totalRevenue and the
   * per-ticket-type breakdown are computed server-side from PAID
   * registrations inside [fromDate, toDate] and frozen onto the document —
   * later refunds/edits don't change what a past report reads.
   */
  async generateRevenueReport(
    actor: OrganizerActor,
    input: GenerateReportInput
  ): Promise<IRevenueReport> {
    const eventId = typeof input.eventId === 'string' ? input.eventId : '';
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }
    const event = await this.getOwnedEvent(eventId, actor);

    const fromDate = this.parseOptionalDate(input.fromDate, 'fromDate');
    const toDate = this.parseOptionalDate(input.toDate, 'toDate');
    if (fromDate && toDate && toDate.getTime() < fromDate.getTime()) {
      throw new AppError('toDate phải sau fromDate', 400);
    }

    const [totals, tickets, paidByTicket] = await Promise.all([
      this.organizerRepository.paidTotalsByEvent(eventId, fromDate, toDate),
      this.organizerRepository.findTicketsByEvent(eventId),
      this.organizerRepository.paidStatsByTicket(eventId, fromDate, toDate),
    ]);

    const ticketBreakdown = tickets.map((t) => {
      const stats = paidByTicket.get(String(t._id)) ?? { revenue: 0, tickets: 0 };
      return {
        ticketId: t._id as mongoose.Types.ObjectId,
        ticketName: t.ticketName,
        price: t.price,
        sold: stats.tickets,
        revenue: stats.revenue,
      };
    });

    const reportName =
      typeof input.reportName === 'string' && input.reportName.trim()
        ? input.reportName.trim().slice(0, 200)
        : `Báo cáo doanh thu — ${event.title}`;

    return this.organizerRepository.createRevenueReport({
      eventId: event._id as mongoose.Types.ObjectId,
      generatedBy: new mongoose.Types.ObjectId(actor.id),
      reportName,
      reportType: 'EVENT_REVENUE',
      fromDate,
      toDate,
      totalRevenue: totals.revenue,
      ticketBreakdown,
      generatedAt: new Date(),
    });
  }

  async listMyReports(
    actor: OrganizerActor,
    query: PaginationQuery
  ): Promise<PaginatedResult<IRevenueReport>> {
    return this.organizerRepository.findReportsByGenerator(actor.id, query);
  }

  /** Owned-report lookup shared by delete and export. */
  private async getOwnedReport(reportId: string, actor: OrganizerActor): Promise<IRevenueReport> {
    if (!mongoose.isValidObjectId(reportId)) {
      throw new AppError('Không tìm thấy báo cáo', 404);
    }
    const report = await this.organizerRepository.findReportById(reportId);
    if (!report) {
      throw new AppError('Không tìm thấy báo cáo', 404);
    }
    if (actor.role !== 'ADMIN' && report.generatedBy.toString() !== actor.id) {
      throw new AppError('Không tìm thấy báo cáo', 404);
    }
    return report;
  }

  async deleteReport(reportId: string, actor: OrganizerActor): Promise<void> {
    await this.getOwnedReport(reportId, actor);
    await this.organizerRepository.deleteReport(reportId);
  }

  /** Bulk delete — silently drops malformed/foreign ids, returns how many were removed. */
  async deleteReports(reportIds: string[], actor: OrganizerActor): Promise<number> {
    const validIds = reportIds.filter((id) => mongoose.isValidObjectId(id));
    if (validIds.length === 0) return 0;
    return this.organizerRepository.deleteReportsOwned(
      validIds,
      actor.id,
      actor.role === 'ADMIN'
    );
  }

  /** Load a report for file export (xlsx/pdf) — same ownership rule as delete. */
  async getReportForExport(reportId: string, actor: OrganizerActor): Promise<IRevenueReport> {
    return this.getOwnedReport(reportId, actor);
  }

  /** Map registrations to AttendeeRow with their canonical SUCCESS audit row joined. */
  private async joinCheckIns(registrations: any[]): Promise<AttendeeRow[]> {
    const ids = registrations.map((r) => String(r._id));
    const checkins = await this.organizerRepository.findSuccessCheckInsByRegistrationIds(ids);
    const checkedMap = new Map(checkins.map((c) => [String(c.registrationId), c]));

    return registrations.map((r) => {
      const participant = r.participantId as any;
      const ticket = r.ticketId as any;
      const checkin = checkedMap.get(String(r._id));
      return {
        registrationId: String(r._id),
        orderCode: `EVB${String(r._id).slice(-8).toUpperCase()}`,
        participantName: participant?.fullName ?? 'Ẩn danh',
        participantEmail: participant?.email ?? '',
        participantPhone: participant?.phone ?? '',
        ticketName: ticket?.ticketName ?? '—',
        unitPrice: r.unitPrice,
        quantity: r.quantity,
        totalAmount: r.totalAmount,
        registerDate: r.registerDate,
        status: r.status,
        checkedIn: !!checkin,
        checkInTime: checkin?.checkedInAt,
      };
    });
  }

  /** Post-event gate for payouts: the event's last day is already over. */
  private hasEventEnded(event: IEvent): boolean {
    const end = event.endDate ?? event.date;
    return !!end && new Date(end).getTime() < Date.now();
  }

  private parseOptionalDate(value: unknown, field: string): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' && !(value instanceof Date)) {
      throw new AppError(`${field} không hợp lệ`, 400);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`${field} không hợp lệ`, 400);
    }
    return date;
  }

  async submitForReview(eventId: string, actor: OrganizerActor): Promise<IEvent> {
    const event = await this.getOwnedEvent(eventId, actor);
    // DRAFT: first submission · REJECTED: resubmission after fixing the
    // admin's correction notes (Rejected → Pending_Review lifecycle loop).
    if (event.reviewStatus !== 'DRAFT' && event.reviewStatus !== 'REJECTED') {
      throw new AppError('Sự kiện đã được gửi duyệt hoặc đã được xử lý', 400);
    }

    const ticketCount = await this.organizerRepository.countTicketsByEvent(eventId);
    if (ticketCount === 0) {
      throw new AppError('Cần ít nhất 1 loại vé trước khi gửi duyệt', 400);
    }

    // At least one legal permit/document is required for the admin to review —
    // this is the authoritative gate covering every submit path (create
    // wizard, standalone permits page, or the "Gửi duyệt" button on my-events).
    if (!event.permitDocuments || event.permitDocuments.length === 0) {
      throw new AppError('Cần đính kèm ít nhất 1 giấy phép / hồ sơ pháp lý trước khi gửi duyệt', 400);
    }

    const updated = await this.organizerRepository.submitEventForReview(eventId);
    if (!updated) {
      // reviewStatus changed between the read above and the atomic update
      // (e.g. an admin decision landed) — treat as an invalid transition.
      throw new AppError('Sự kiện đã được gửi duyệt hoặc đã được xử lý', 400);
    }
    return updated;
  }

  async getMyEvents(
    organizerId: string,
    query: OrganizerEventQuery
  ): Promise<PaginatedResult<IEvent>> {
    return this.organizerRepository.findEventsByCreator(organizerId, query);
  }

  async getEventDetail(
    eventId: string,
    actor: OrganizerActor
  ): Promise<{ event: IEvent; tickets: ITicket[] }> {
    const event = await this.getOwnedEvent(eventId, actor);
    const tickets = await this.organizerRepository.findTicketsByEvent(eventId);
    const paidStats = await this.organizerRepository.paidStatsByTicket(eventId);

    const updatedTickets = tickets.map((t) => {
      const stats = paidStats.get(String(t._id));
      return {
        ...t,
        soldQuantity: stats ? stats.tickets : 0,
      };
    });

    return { event, tickets: updatedTickets };
  }

  // Loads an event and enforces that only its creator (or an admin) may act on it.
  private async getOwnedEvent(eventId: string, actor: OrganizerActor): Promise<IEvent> {
    const event = await this.organizerRepository.findEventById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    if (actor.role !== 'ADMIN') {
      const ownerId = event.creatorId?.toString();
      if (!ownerId || ownerId !== actor.id) {
        throw new AppError('Bạn không có quyền quản lý sự kiện này', 403);
      }
    }
    return event;
  }

  // DRAFT and REJECTED are the organizer-editable states: a rejected event must
  // stay correctable so it can be fixed and resubmitted (Rejected → Pending_Review).
  // PENDING_REVIEW is locked in the admin queue; PUBLISHED is immutable to organizers.
  private assertEditable(event: IEvent, action: string): void {
    if (event.reviewStatus !== 'DRAFT' && event.reviewStatus !== 'REJECTED') {
      throw new AppError(
        `Chỉ có thể ${action} khi sự kiện đang ở trạng thái nháp hoặc bị từ chối (hiện tại: ${event.reviewStatus})`,
        400
      );
    }
  }

  // Stock is only adjustable while tickets are on sale — i.e. before the event
  // begins. Once it has started (ongoing or already over) the stock is frozen.
  // Uses startDate (fall back to the legacy date) as the cutoff.
  private assertNotStarted(event: IEvent, action: string): void {
    const startRef = event.startDate ?? event.date;
    if (startRef && new Date(startRef).getTime() <= Date.now()) {
      throw new AppError(`Sự kiện đã bắt đầu — không thể ${action}`, 400);
    }
  }

  // Loads a ticket and enforces it actually belongs to the given event, so an
  // organizer can't reference another event's ticket id through this event's URL.
  private async getEventTicket(eventId: string, ticketId: string): Promise<ITicket> {
    const ticket = await this.organizerRepository.findTicketById(ticketId);
    if (!ticket || ticket.eventId.toString() !== eventId) {
      throw new AppError('Ticket not found', 404);
    }
    return ticket;
  }

  // ── Deposit & settlement ────────────────────────────────────────────────
  // Remaining = 80% serviceCost + additionalCost, unless finalPaymentAmount was
  // already pinned down by a previous quote/attempt.
  private computeRemainingAmount(event: IEvent): number {
    if (event.finalPaymentAmount && event.finalPaymentAmount > 0) {
      return event.finalPaymentAmount;
    }
    const serviceCost = event.serviceCost || 0;
    const depositAmount = event.depositAmount || 0;
    const additionalCost = event.additionalCost || 0;
    return Math.max(0, serviceCost - depositAmount + additionalCost);
  }

  private buildOrganizerVnpayUrl(
    amount: number,
    orderInfo: string,
    txnRefPrefix: string,
    ipAddr: string
  ): string {
    if (!config.vnpay.tmnCode || !config.vnpay.hashSecret) {
      throw new AppError('VNPAY chưa được cấu hình (thiếu VNPAY_TMN_CODE/VNPAY_HASH_SECRET)', 500);
    }
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.vnpay.tmnCode,
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: `${txnRefPrefix}${Date.now()}${Math.floor(Math.random() * 1000)}`,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: config.vnpay.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: formatVnpayDate(new Date()),
    };
    return buildPaymentUrl(config.vnpay.url, params, config.vnpay.hashSecret);
  }

  /**
   * Organizer initiates the 20% deposit via VNPAY. Returns the redirect URL —
   * the event only moves APPROVED_WAITING_DEPOSIT → PUBLISHED once VNPAY confirms
   * through `finalizeDepositVnpayPayment` (return-redirect or IPN callback).
   */
  async createDepositPaymentUrl(
    eventId: string,
    actor: { id: string; role: string },
    ipAddr: string
  ): Promise<string> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.reviewStatus !== 'APPROVED_WAITING_DEPOSIT') {
      throw new AppError('Sự kiện không ở trạng thái chờ cọc', 400);
    }
    if (event.depositStatus === 'PAID') {
      throw new AppError('Khoản cọc đã được thanh toán trước đó', 400);
    }
    const amount = event.depositAmount || 0;
    if (amount <= 0) {
      throw new AppError('Số tiền cọc không hợp lệ', 400);
    }
    return this.buildOrganizerVnpayUrl(
      amount,
      buildEventDepositOrderInfo(eventId),
      'EVBDEP',
      ipAddr
    );
  }

  /**
   * Organizer initiates the remaining-balance payment via VNPAY anytime after the
   * deposit is paid. Actual `finalPaymentStatus` flip happens in
   * `finalizeRemainingVnpayPayment` once VNPAY confirms.
   */
  async createRemainingPaymentUrl(
    eventId: string,
    actor: { id: string; role: string },
    ipAddr: string
  ): Promise<string> {
    const event = await this.getOwnedEvent(eventId, actor);
    if (event.finalPaymentStatus === 'PAID') {
      throw new AppError('Khoản thanh toán đã được thanh toán trước đó', 400);
    }
    const remaining = this.computeRemainingAmount(event);
    if (remaining <= 0) {
      throw new AppError('Không có khoản phải thanh toán', 400);
    }
    return this.buildOrganizerVnpayUrl(
      remaining,
      buildEventRemainingOrderInfo(eventId),
      'EVBREM',
      ipAddr
    );
  }

  /**
   * Called only from the VNPAY return/IPN callback (payment.controller.ts) after signature
   * verification — no `actor`/ownership check here since VNPAY calls back without a user
   * session. `organizerRepository.payDeposit`'s DB filter only matches while still UNPAID,
   * so a racing return-redirect + IPN pair for the same order can never double-process it.
   */
  async finalizeDepositVnpayPayment(
    eventId: string,
    params: { transactionNo: string; amountVnd100: number }
  ): Promise<IEvent> {
    const event = await this.organizerRepository.findEventById(eventId);
    if (!event) {
      throw new AppError(`Không tìm thấy sự kiện ${eventId}`, 404);
    }
    if (event.depositStatus === 'PAID') {
      return event; // already finalized by a racing return/IPN call
    }

    const expectedAmount = Math.round((event.depositAmount || 0) * 100);
    if (expectedAmount !== params.amountVnd100) {
      throw new AppError('Số tiền thanh toán cọc không khớp', 400);
    }

    const updated = await this.organizerRepository.payDeposit(eventId);
    if (!updated) {
      const reloaded = await this.organizerRepository.findEventById(eventId);
      if (reloaded?.depositStatus === 'PAID') return reloaded;
      throw new AppError('Xác nhận thanh toán cọc thất bại — vui lòng liên hệ hỗ trợ', 409);
    }
    return updated;
  }

  /** Same idempotency guarantee as `finalizeDepositVnpayPayment`, for the remaining balance. */
  async finalizeRemainingVnpayPayment(
    eventId: string,
    params: { transactionNo: string; amountVnd100: number }
  ): Promise<IEvent> {
    const event = await this.organizerRepository.findEventById(eventId);
    if (!event) {
      throw new AppError(`Không tìm thấy sự kiện ${eventId}`, 404);
    }
    if (event.finalPaymentStatus === 'PAID') {
      return event;
    }

    const remaining = this.computeRemainingAmount(event);
    const expectedAmount = Math.round(remaining * 100);
    if (expectedAmount !== params.amountVnd100) {
      throw new AppError('Số tiền thanh toán không khớp', 400);
    }

    const updated = await this.organizerRepository.payRemaining(eventId, remaining);
    if (!updated) {
      const reloaded = await this.organizerRepository.findEventById(eventId);
      if (reloaded?.finalPaymentStatus === 'PAID') return reloaded;
      throw new AppError('Xác nhận thanh toán thất bại — vui lòng liên hệ hỗ trợ', 409);
    }
    return updated;
  }

  /**
   * Organizer cancels their event.
   */
  async cancelEvent(eventId: string, userId: string, reason: string): Promise<IEvent> {
    const event = await this.getOwnedEvent(eventId, { id: userId, role: 'ORGANIZER' });
    if (event.status === 'cancelled') {
      throw new AppError('Sự kiện đã bị hủy trước đó', 400);
    }
    const updated = await this.organizerRepository.cancelEvent(eventId, reason);
    if (!updated) {
      throw new AppError('Không thể hủy sự kiện', 409);
    }
    return updated;
  }
}
