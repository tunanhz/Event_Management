import mongoose from 'mongoose';
import { AdminEventRepository, AdminEventQuery } from './admin-event.repository';
import { IEvent } from '../event/event.model';
import { ITicket } from '../organizer/ticket.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';

const REVIEW_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'APPROVED_WAITING_DEPOSIT', 'PUBLISHED', 'REJECTED'] as const;

/**
 * Admin event moderation (AM-01): review queue, detail inspection and the
 * approve / reject decisions that gate organizer events onto the public site.
 */
export class AdminEventService {
  private adminEventRepository: AdminEventRepository;

  constructor() {
    this.adminEventRepository = new AdminEventRepository();
  }

  async listEvents(query: AdminEventQuery): Promise<PaginatedResult<IEvent>> {
    if (query.reviewStatus && !REVIEW_STATUSES.includes(query.reviewStatus as any)) {
      throw new AppError(
        `reviewStatus chỉ nhận một trong: ${REVIEW_STATUSES.join(', ')}`,
        400
      );
    }
    return this.adminEventRepository.findEvents(query);
  }

  async getEventDetail(eventId: string): Promise<{ event: IEvent; tickets: ITicket[] }> {
    const event = await this.getEventOrThrow(eventId);
    const tickets = await this.adminEventRepository.findTicketsByEvent(eventId);
    return { event, tickets };
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
        'Sự kiện không còn ở trạng thái chờ duyệt (có thể đã được xử lý bởi admin khác). Vui lòng tải lại hàng đợi.',
        409
      );
    }
    return updated;
  }

  /** PENDING_REVIEW → REJECTED; requires a correction reason for the organizer. */
  async rejectEvent(eventId: string, reason: unknown): Promise<IEvent> {
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    if (!trimmedReason) {
      throw new AppError('Vui lòng nhập lý do từ chối để organizer chỉnh sửa lại hồ sơ', 400);
    }
    if (trimmedReason.length > 1000) {
      throw new AppError('Lý do từ chối tối đa 1000 ký tự', 400);
    }

    await this.getEventOrThrow(eventId);

    const updated = await this.adminEventRepository.rejectEvent(eventId, trimmedReason);
    if (!updated) {
      throw new AppError(
        'Sự kiện không còn ở trạng thái chờ duyệt (có thể đã được xử lý bởi admin khác). Vui lòng tải lại hàng đợi.',
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
}
