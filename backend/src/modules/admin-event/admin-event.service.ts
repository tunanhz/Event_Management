import mongoose from 'mongoose';
import {
  AdminEventRepository,
  AdminEventQuery,
} from './admin-event.repository';
import { IEvent, Event } from '../event/event.model';
import { ITicket } from '../organizer/ticket.model';
import { User } from '../user/user.model';
import { Registration } from '../registration/registration.model';
import { CategoryRepository } from '../category/category.repository';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

const REVIEW_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED_WAITING_DEPOSIT', 'PUBLISHED', 'REJECTED'] as const;
const LIFECYCLE_STATUSES = ['draft', 'published', 'cancelled', 'completed'] as const;

type ReviewStatus = (typeof REVIEW_STATUSES)[number];
type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export interface AdminEventUpdateInput {
  title?: unknown;
  description?: unknown;
  location?: unknown;
  categoryId?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  capacity?: unknown;
  banner?: unknown;
  posterImage?: unknown;
  organizer?: unknown;
  organizerLogoUrl?: unknown;
  organizerDescription?: unknown;
  isFeatured?: unknown;
  isTrending?: unknown;
  privacy?: unknown;
  confirmationMessage?: unknown;
}

export interface AdminEventStatusInput {
  status?: unknown;
  reviewStatus?: unknown;
  rejectionReason?: unknown;
  privacy?: unknown;
}

/**
 * Admin event administration: moderation plus full operational management
 * across every event in the system.
 */
export class AdminEventService {
  private adminEventRepository: AdminEventRepository;

  constructor() {
    this.adminEventRepository = new AdminEventRepository();
  }

  async listEvents(query: AdminEventQuery): Promise<PaginatedResult<IEvent>> {
    if (query.reviewStatus && !REVIEW_STATUSES.includes(query.reviewStatus as any)) {
      throw new AppError(`reviewStatus chi nhan mot trong: ${REVIEW_STATUSES.join(', ')}`, 400);
    }
    if (query.status && !LIFECYCLE_STATUSES.includes(query.status as any)) {
      throw new AppError(`status chi nhan mot trong: ${LIFECYCLE_STATUSES.join(', ')}`, 400);
    }
    if (query.categoryId && !mongoose.isValidObjectId(query.categoryId)) {
      throw new AppError('Category khong hop le', 400);
    }
    if (query.creatorId && !mongoose.isValidObjectId(query.creatorId)) {
      throw new AppError('Organizer khong hop le', 400);
    }
    return this.adminEventRepository.findEvents(query);
  }

  async getEventDetail(eventId: string): Promise<{ event: IEvent; tickets: ITicket[] }> {
    const event = await this.getEventOrThrow(eventId);
    const tickets = await this.adminEventRepository.findTicketsByEvent(eventId);
    return { event, tickets };
  }

  async cancelEvent(eventId: string, reason?: unknown): Promise<IEvent> {
    await this.getEventOrThrow(eventId);
    const trimmedReason = this.asOptionalTrimmedString(reason);
    const updated = await this.adminEventRepository.updateEvent(eventId, {
      status: 'cancelled',
      ...(trimmedReason ? { rejectionReason: trimmedReason } : {}),
    });
    if (!updated) throw new AppError('Event not found', 404);
    return updated;
  }

  async deleteEvent(eventId: string, force = false): Promise<void> {
    await this.getEventOrThrow(eventId);
    const registrationCount = await this.adminEventRepository.countRegistrationsByEvent(eventId);
    if (registrationCount > 0 && !force) {
      throw new AppError(
        `Su kien dang co ${registrationCount} luot dang ky. Gui force=true neu muon xoa cascade toan bo ve, dang ky va thanh toan lien quan.`,
        409
      );
    }
    await this.adminEventRepository.deleteEventCascade(eventId);
  }

  /**
   * Approve an event. If serviceCost > 0 → APPROVED_WAITING_DEPOSIT (organizer
   * must pay 20% deposit before the event goes public). Otherwise → PUBLISHED.
   */
  async approveEvent(eventId: string, adminId: string, serviceCost: number): Promise<IEvent> {
    await this.getEventOrThrow(eventId);

    if (serviceCost > 0) {
      const depositAmount = Math.round(serviceCost * 0.2);
      const updated = await this.adminEventRepository.approveEventWithDeposit(
        eventId,
        adminId,
        serviceCost,
        depositAmount
      );
      if (!updated) {
        throw new AppError(
          'Sự kiện không còn ở trạng thái chờ duyệt (có thể đã được xử lý bởi admin khác). Vui lòng tải lại hàng đợi.',
          409
        );
      }
      return updated;
    }

    // No services → publish directly
    const updated = await this.adminEventRepository.approveEventDirect(eventId, adminId);
    if (!updated) {
      throw new AppError(
        'Su kien khong con o trang thai cho duyet. Vui long tai lai hang doi.',
        409
      );
    }
    return updated;
  }

  /** PENDING_REVIEW -> REJECTED; requires a correction reason for the organizer. */
  async rejectEvent(eventId: string, reason: unknown): Promise<IEvent> {
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason) {
      throw new AppError('Vui long nhap ly do tu choi de organizer chinh sua lai ho so', 400);
    }
    if (trimmedReason.length > 1000) {
      throw new AppError('Ly do tu choi toi da 1000 ky tu', 400);
    }

    await this.getEventOrThrow(eventId);

    const updated = await this.adminEventRepository.rejectEvent(eventId, trimmedReason);
    if (!updated) {
      throw new AppError(
        'Su kien khong con o trang thai cho duyet. Vui long tai lai hang doi.',
        409
      );
    }
    return updated;
  }

  /** Set additional cost for post-event settlement. */
  async setAdditionalCost(eventId: string, additionalCost: number): Promise<IEvent> {
    if (typeof additionalCost !== 'number' || additionalCost < 0) {
      throw new AppError('Chi phí phát sinh phải là số >= 0', 400);
    }
    const event = await this.getEventOrThrow(eventId);
    if (event.serviceCost <= 0) {
      throw new AppError('Sự kiện không có dịch vụ thuê nên không có chi phí phát sinh', 400);
    }
    const updated = await this.adminEventRepository.setAdditionalCost(eventId, additionalCost);
    if (!updated) {
      throw new AppError('Không thể cập nhật chi phí phát sinh', 500);
    }
    return updated;
  }

  // Friendly 404s for bad/unknown ids (avoids a raw Mongoose CastError → 500).
  private async getEventOrThrow(eventId: string): Promise<IEvent> {
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('Event not found', 404);
    }
    const event = await this.adminEventRepository.findEventById(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }
    return event;
  }

  private asTrimmedString(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') {
      throw new AppError('Du lieu chuoi khong hop le', 400);
    }
    const trimmed = value.trim();
    if (!trimmed) throw new AppError('Du lieu bat buoc khong duoc de trong', 400);
    return trimmed;
  }

  private asOptionalTrimmedString(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (value === null) return '';
    if (typeof value !== 'string') {
      throw new AppError('Du lieu chuoi khong hop le', 400);
    }
    return value.trim();
  }

  private asDate(value: unknown, field: string): Date | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' && !(value instanceof Date)) {
      throw new AppError(`${field} khong hop le`, 400);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`${field} khong hop le`, 400);
    }
    return date;
  }

  async updateEvent(eventId: string, input: AdminEventUpdateInput): Promise<IEvent> {
    await this.getEventOrThrow(eventId);
    const update: Partial<IEvent> = {};

    const title = this.asOptionalTrimmedString(input.title);
    if (title) update.title = title;

    const description = this.asOptionalTrimmedString(input.description);
    if (description !== undefined) update.description = description;

    const location = this.asOptionalTrimmedString(input.location);
    if (location) update.location = location;

    const organizer = this.asOptionalTrimmedString(input.organizer);
    if (organizer) update.organizer = organizer;

    const organizerLogoUrl = this.asOptionalTrimmedString(input.organizerLogoUrl);
    if (organizerLogoUrl !== undefined) update.organizerLogoUrl = organizerLogoUrl;

    const organizerDescription = this.asOptionalTrimmedString(input.organizerDescription);
    if (organizerDescription !== undefined) update.organizerDescription = organizerDescription;

    const banner = this.asOptionalTrimmedString(input.banner);
    if (banner !== undefined) update.banner = banner;

    const posterImage = this.asOptionalTrimmedString(input.posterImage);
    if (posterImage !== undefined) update.posterImage = posterImage;

    const confirmationMessage = this.asOptionalTrimmedString(input.confirmationMessage);
    if (confirmationMessage !== undefined) update.confirmationMessage = confirmationMessage;

    if (input.categoryId !== undefined) {
      const catId = this.asOptionalTrimmedString(input.categoryId);
      if (catId) {
        if (!mongoose.isValidObjectId(catId)) throw new AppError('categoryId khong hop le', 400);
        const catRepo = new CategoryRepository();
        const cat = await catRepo.findById(catId);
        if (!cat) throw new AppError('Danh muc khong ton tai', 404);
        (update as any).categoryId = new mongoose.Types.ObjectId(catId);
        update.category = cat.name;
        update.categorySlug = cat.slug;
      }
    }

    const startDate = this.asDate(input.startDate, 'startDate');
    if (startDate) update.startDate = startDate;

    const endDate = this.asDate(input.endDate, 'endDate');
    if (endDate) update.endDate = endDate;

    if (input.capacity !== undefined) {
      const cap = Number(input.capacity);
      if (Number.isNaN(cap) || cap < 1) throw new AppError('capacity phai >= 1', 400);
      update.capacity = cap;
    }

    if (input.isFeatured !== undefined) update.isFeatured = Boolean(input.isFeatured);
    if (input.isTrending !== undefined) update.isTrending = Boolean(input.isTrending);

    const privacy = this.asOptionalTrimmedString(input.privacy);
    if (privacy !== undefined) {
      update.privacy = privacy === 'private' ? 'private' : 'public';
    }

    const updated = await this.adminEventRepository.updateEvent(eventId, update);
    if (!updated) throw new AppError('Event not found', 404);
    return updated;
  }

  async forceStatus(
    eventId: string,
    adminId: string,
    input: AdminEventStatusInput
  ): Promise<IEvent> {
    await this.getEventOrThrow(eventId);
    const update: Partial<IEvent> = {};

    const status = this.asOptionalTrimmedString(input.status) as LifecycleStatus | undefined;
    const reviewStatus = this.asOptionalTrimmedString(input.reviewStatus) as ReviewStatus | undefined;
    const privacy = this.asOptionalTrimmedString(input.privacy) as 'public' | 'private' | undefined;

    if (!status && !reviewStatus && !privacy) {
      throw new AppError('Can truyen status, reviewStatus hoac privacy', 400);
    }
    if (status && !LIFECYCLE_STATUSES.includes(status)) {
      throw new AppError(`status chi nhan mot trong: ${LIFECYCLE_STATUSES.join(', ')}`, 400);
    }
    if (reviewStatus && !REVIEW_STATUSES.includes(reviewStatus)) {
      throw new AppError(`reviewStatus chi nhan mot trong: ${REVIEW_STATUSES.join(', ')}`, 400);
    }

    if (status) update.status = status;
    if (reviewStatus) update.reviewStatus = reviewStatus;
    if (privacy) {
      if (privacy !== 'public' && privacy !== 'private') {
        throw new AppError('privacy chi nhan public hoac private', 400);
      }
      update.privacy = privacy;
    }

    if ((reviewStatus ?? (status === 'published' ? 'PUBLISHED' : undefined)) === 'PUBLISHED') {
      update.reviewStatus = 'PUBLISHED';
      update.reviewedAt = new Date();
    }

    if (reviewStatus === 'REJECTED') {
      const reason = this.asTrimmedString(input.rejectionReason);
      if (!reason) {
        throw new AppError('Can nhap ly do khi ep trang thai REJECTED', 400);
      }
      update.rejectionReason = reason;
      update.reviewedAt = new Date();
      if (!status) update.status = 'draft';
    }

    if (reviewStatus === 'PENDING_REVIEW' && !status) {
      update.status = 'draft';
      update.rejectionReason = undefined;
    }

    const updated = await this.adminEventRepository.updateEvent(eventId, update);
    if (!updated) throw new AppError('Event not found', 404);
    return updated;
  }

  async getDashboardStats() {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    
    // Count active events (reviewStatus = 'PUBLISHED')
    const activeEvents = await Event.countDocuments({ reviewStatus: 'PUBLISHED' });
    
    // Count pending review
    const pendingApprovals = await Event.countDocuments({ reviewStatus: 'PENDING_REVIEW' });

    // Calculate total revenue from PAID registrations
    const revenueResult = await Registration.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Monthly revenue data for year 2026
    const monthlyRevenueRaw = await Registration.aggregate([
      {
        $match: {
          status: 'PAID',
          registerDate: {
            $gte: new Date('2026-01-01T00:00:00.000Z'),
            $lte: new Date('2026-12-31T23:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: { $month: '$registerDate' },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Map monthly revenue raw to 12 months (T1 to T12)
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const found = monthlyRevenueRaw.find(m => m._id === monthNum);
      return {
        month: `T${monthNum}`,
        revenue: found ? found.revenue : 0
      };
    });

    // Recent 4 pending review events
    const pendingEvents = await Event.find({ reviewStatus: 'PENDING_REVIEW' })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate('creatorId', 'fullName')
      .lean();

    return {
      totalUsers,
      attendeeGrowth: 15.2, // mock growth percentage
      totalEvents,
      activeEvents,
      totalRevenue,
      revenueGrowth: 20.1, // mock growth percentage
      pendingApprovals,
      monthlyRevenue,
      pendingEvents: pendingEvents.map((e: any) => ({
        id: String(e._id),
        title: e.title,
        organizer: e.organizer || e.creatorId?.fullName || 'Không xác định',
        location: e.location || 'Chưa đặt địa điểm',
        category: e.category || 'Chưa phân loại',
        submittedAt: e.createdAt
      }))
    };
  }

  async getDashboardReports() {
    // 1. Monthly revenue
    const monthlyRevenueRaw = await Registration.aggregate([
      {
        $match: {
          status: 'PAID',
          registerDate: {
            $gte: new Date('2026-01-01T00:00:00.000Z'),
            $lte: new Date('2026-12-31T23:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: { $month: '$registerDate' },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const found = monthlyRevenueRaw.find(m => m._id === monthNum);
      return {
        month: `T${monthNum}`,
        revenue: found ? found.revenue : 0
      };
    });

    // 2. Event categories distribution
    const categoryStatsRaw = await Event.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    const categoryData = categoryStatsRaw.map(c => ({
      name: c._id || 'Khác',
      value: c.count
    }));

    if (categoryData.length === 0) {
      categoryData.push({ name: 'Chưa có sự kiện', value: 0 });
    }

    // 3. Top 5 events by revenue
    const topEventsRaw = await Registration.aggregate([
      { $match: { status: 'PAID' } },
      {
        $group: {
          _id: '$eventId',
          ticketsSold: { $sum: '$quantity' },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    const topEvents = [];
    for (const item of topEventsRaw) {
      const ev = await Event.findById(item._id).lean();
      if (ev) {
        topEvents.push({
          id: String(ev._id),
          title: ev.title,
          location: ev.location || 'Chưa đặt địa điểm',
          ticketsSold: item.ticketsSold,
          capacity: ev.capacity || ev.maxAttendees || 100,
          revenue: item.revenue
        });
      }
    }

    return {
      monthlyRevenue,
      categoryData,
      topEvents
    };
  }
}
