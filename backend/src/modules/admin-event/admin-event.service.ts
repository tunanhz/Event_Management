import mongoose from 'mongoose';
import {
  AdminEventRepository,
  AdminEventQuery,
} from './admin-event.repository';
import { IEvent } from '../event/event.model';
import { ITicket } from '../organizer/ticket.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

const REVIEW_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED_WAITING_DEPOSIT', 'PUBLISHED', 'REJECTED'] as const;
const LIFECYCLE_STATUSES = ['draft', 'published', 'cancelled', 'completed'] as const;

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

}
