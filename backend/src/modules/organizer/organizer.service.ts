import mongoose from 'mongoose';
import { OrganizerRepository, OrganizerEventQuery } from './organizer.repository';
import { IEvent } from '../event/event.model';
import { ITicket } from './ticket.model';
import { CategoryRepository } from '../category/category.repository';
import { UserRepository } from '../user/user.repository';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';
import {
  ConfigureTicketInput,
  CreateEventInput,
  CreateTicketInput,
  ShowInput,
  UpdateEventInput,
  UpdateTicketInput,
} from './event-wizard-types';
import {
  buildContractSubdoc,
  composeLocation,
  resolveCreateSchedule,
  resolveShowTimes,
  ResolvedCreateSchedule,
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
        shows: ctx.schedule.shows.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        slug: ctx.slug,
        privacy: data.privacy ?? 'public',
        confirmationMessage: data.confirmationMessage,
        enableQuestions: data.enableQuestions === true,
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

    // Schedule: replacing the show list wins; else direct startDate/endDate;
    // else merge with the existing dates so partial updates still validate.
    if (data.shows !== undefined) {
      update.shows = await this.resolveShowReplacement(event, data.shows);
      const { startDate, endDate } = resolveShowTimes(data.shows);
      update.startDate = startDate;
      update.endDate = endDate;
    } else {
      // Shows own the schedule: direct date edits on a shows-based event would
      // silently desync startDate/endDate from the show list.
      if (event.shows.length > 0 && (data.startDate !== undefined || data.endDate !== undefined)) {
        throw new AppError(
          'Sự kiện có suất diễn — hãy cập nhật thời gian qua trường shows',
          400
        );
      }
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
    if (data.enableQuestions !== undefined) {
      update.enableQuestions = data.enableQuestions === true;
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
      startTime: r.startTime,
      endTime: r.endTime,
    }));
  }

  async addTicket(
    eventId: string,
    actor: OrganizerActor,
    input: CreateTicketInput & { showId?: string }
  ): Promise<ITicket> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'thêm loại vé');
    validateTicketInput(input);
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
    validateTicketInput(merged);

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
      validateTicketInput(ticket);
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

  async listShows(eventId: string, actor: OrganizerActor): Promise<IEvent['shows']> {
    const event = await this.getOwnedEvent(eventId, actor);
    return event.shows;
  }

  /**
   * Schedule management (EM-25): replace an event's whole show/schedule list
   * in one call — same "submit the whole table" shape as configureTickets.
   * Rows carrying `_id` retime an existing show, rows without one create a
   * new show, and any existing show left out of the submitted set is removed
   * (blocked by resolveShowReplacement while a ticket type still references
   * it). startDate/endDate/time/sessions are recomputed from the new show
   * list so discovery fields (homepage/listing) stay in sync.
   */
  async configureShows(
    eventId: string,
    actor: OrganizerActor,
    shows: ShowInput[]
  ): Promise<IEvent['shows']> {
    const event = await this.getOwnedEvent(eventId, actor);
    this.assertEditable(event, 'cấu hình lịch trình');

    const newShows = await this.resolveShowReplacement(event, shows);
    const { startDate, endDate } = resolveShowTimes(shows);

    const updated = await this.organizerRepository.updateEditableEvent(eventId, {
      shows: newShows,
      startDate,
      endDate,
      date: startDate,
      time: deriveTime(startDate),
      sessions: deriveSessions(newShows, startDate),
    });
    if (!updated) {
      // reviewStatus changed between assertEditable and the atomic write
      // (e.g. a concurrent submit locked the event into the review queue).
      throw new AppError(
        'Chỉ có thể cấu hình lịch trình khi sự kiện đang ở trạng thái nháp hoặc bị từ chối',
        400
      );
    }
    return updated.shows;
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
    return { event, tickets };
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

  // Loads a ticket and enforces it actually belongs to the given event, so an
  // organizer can't reference another event's ticket id through this event's URL.
  private async getEventTicket(eventId: string, ticketId: string): Promise<ITicket> {
    const ticket = await this.organizerRepository.findTicketById(ticketId);
    if (!ticket || ticket.eventId.toString() !== eventId) {
      throw new AppError('Ticket not found', 404);
    }
    return ticket;
  }

}
