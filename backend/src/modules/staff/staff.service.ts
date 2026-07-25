import mongoose from 'mongoose';
import { StaffRepository } from './staff.repository';
import { IStaffAssignment } from './assignment.model';
import { ICheckInLog } from './checkin-log.model';
import { IIncidentReport, IncidentStatus } from './incident.model';
import { IRegistration } from '../registration/registration.model';
import { IEvent } from '../event/event.model';
import { ITicket } from '../organizer/ticket.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';
import { CheckInStats } from './staff.repository';

const ASSIGNMENT_CONFIRMATION_LEAD_MS = 60 * 60 * 1000;
const CHECK_IN_OPEN_BEFORE_MS = 2 * 60 * 60 * 1000;
const CHECK_IN_CLOSE_AFTER_MS = 30 * 60 * 1000;

type CheckInWindowFailure = {
  result: 'too_early' | 'event_ended' | 'invalid';
  message: string;
};

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  eventId: string;
  staffId: string;
  note?: string;
}

export interface CheckInInput {
  ticketCode: string;
  eventId: string;
  staffId: string;
  gate?: string;
}

export interface CheckInResponse {
  result: ICheckInLog['result'];
  message: string;
  attendeeName?: string;
  ticketName?: string;
  checkedInAt?: Date;
  /** Giờ check-in trước đó (khi result = duplicate) */
  previousCheckedInAt?: Date;
}

export interface CreateIncidentInput {
  eventId: string;
  staffId: string;
  title: string;
  description: string;
  location: string;
  severity: IIncidentReport['severity'];
  category: IIncidentReport['category'];
  attachments?: string[];
}

export interface UpdateIncidentStatusInput {
  status: IncidentStatus;
  resolvedNote?: string;
  adminId?: string;
}

export class StaffService {
  private staffRepository: StaffRepository;

  constructor() {
    this.staffRepository = new StaffRepository();
  }

  // ── Assignments ─────────────────────────────────────────────────────────────

  /** Admin tạo phân công — một staff chỉ được giao một lần cho một sự kiện. */
  async createAssignment(input: CreateAssignmentInput): Promise<IStaffAssignment> {
    this.assertValidObjectIds(input.eventId, input.staffId);

    const event = await this.staffRepository.findEventById(input.eventId);
    if (!event) throw new AppError('Sự kiện không tồn tại', 404);
    if (event.status === 'cancelled') throw new AppError('Không thể phân công cho sự kiện đã hủy', 400);
    if (this.isConfirmationDeadlinePassed(event)) {
      throw new AppError('Đã quá hạn phân công: staff phải xác nhận trước khi sự kiện bắt đầu 1 giờ', 400);
    }

    // Kiểm tra trùng
    const existing = await this.staffRepository.findAssignmentByEventAndStaff(
      input.eventId,
      input.staffId
    );
    if (existing) {
      throw new AppError('Nhân viên này đã được phân công cho sự kiện đó', 409);
    }

    const note = this.normalizeAssignmentNote(input.note);

    return this.staffRepository.createAssignment({
      ...input,
      // Các trường này được giữ để tương thích với dữ liệu cũ. Phân công mới
      // chỉ dùng note làm nội dung nhiệm vụ và không còn chia theo cổng/ca.
      gate: 'Không phân cổng',
      shift: 'Theo lịch sự kiện',
      responsibility: note || 'Theo phân công',
      note,
    });
  }

  /** Lấy danh sách sự kiện được phân công (Staff xem ca trực của mình). */
  async getMyAssignments(staffId: string): Promise<IStaffAssignment[]> {
    const assignments = await this.staffRepository.findAssignments({ staffId, status: undefined });
    return this.expireOverdueAssignments(assignments);
  }

  /** Admin xem danh sách staff được phân công cho một sự kiện. */
  async getEventAssignments(eventId: string): Promise<IStaffAssignment[]> {
    this.assertValidObjectId(eventId, 'eventId');
    const assignments = await this.staffRepository.findAssignments({ eventId });
    return this.expireOverdueAssignments(assignments);
  }

  /** Admin cập nhật ghi chú nhiệm vụ của một phân công. */
  async updateAssignmentNote(
    assignmentId: string,
    eventId: string,
    note: unknown
  ): Promise<IStaffAssignment> {
    this.assertValidObjectIds(assignmentId, eventId);
    const updated = await this.staffRepository.updateAssignmentNote(
      assignmentId,
      eventId,
      this.normalizeAssignmentNote(note)
    );
    if (!updated) throw new AppError('Phân công không tồn tại trong sự kiện này', 404);
    return updated;
  }

  /** Staff xác nhận nhận ca. */
  async confirmAssignment(assignmentId: string, staffId: string): Promise<IStaffAssignment> {
    this.assertValidObjectId(assignmentId, 'assignmentId');
    const assignment = await this.staffRepository.findAssignmentById(assignmentId);
    if (!assignment) throw new AppError('Phân công không tồn tại', 404);

    // Chỉ staff được giao mới confirm được
    if (assignment.staffId.toString() !== staffId) {
      throw new AppError('Bạn không có quyền xác nhận phân công này', 403);
    }
    if (assignment.status !== 'assigned') {
      throw new AppError('Phân công không còn ở trạng thái chờ xác nhận', 400);
    }

    const event = await this.staffRepository.findEventById(assignment.eventId.toString());
    if (!event) throw new AppError('Sự kiện không tồn tại', 404);
    if (this.isConfirmationDeadlinePassed(event)) {
      await this.staffRepository.transitionPendingAssignment(assignmentId, 'expired');
      throw new AppError('Đã quá hạn xác nhận ca. Bạn được ghi nhận là không làm ca này', 400);
    }

    const updated = await this.staffRepository.transitionPendingAssignment(
      assignmentId,
      'confirmed',
      new Date()
    );
    if (!updated) throw new AppError('Trạng thái phân công vừa thay đổi, vui lòng tải lại', 409);
    return updated;
  }

  /** Staff can operate an event only after confirming the assignment on time. */
  async assertConfirmedAssignment(eventId: string, staffId: string): Promise<void> {
    this.assertValidObjectIds(eventId, staffId);
    const [assignment] = await this.expireOverdueAssignments(
      await this.staffRepository.findAssignments({ eventId, staffId })
    );

    if (!assignment) {
      throw new AppError('Bạn không được phân công làm việc tại sự kiện này', 403);
    }
    if (assignment.status === 'expired') {
      throw new AppError('Ca làm đã quá hạn xác nhận và được ghi nhận là không làm', 403);
    }
    if (assignment.status !== 'confirmed') {
      throw new AppError('Bạn cần xác nhận ca trước khi sử dụng chức năng vận hành', 403);
    }
  }

  /** Admin hủy phân công. */
  async deleteAssignment(assignmentId: string, eventId: string): Promise<void> {
    this.assertValidObjectIds(assignmentId, eventId);
    const deleted = await this.staffRepository.deleteAssignment(assignmentId);
    if (!deleted) throw new AppError('Phân công không tồn tại', 404);
  }

  // ── Check-in ─────────────────────────────────────────────────────────────────

  /**
   * Xác thực mã vé và thực hiện check-in:
   * 1. Tìm registration theo ticketCode trong DB
   * 2. Kiểm tra đúng sự kiện
   * 3. Kiểm tra trạng thái (PAID + chưa check-in)
   * 4. Atomic markCheckedIn (guard duplicate race condition)
   * 5. Ghi log
   */
  async checkIn(input: CheckInInput): Promise<CheckInResponse> {
    const { ticketCode, eventId, staffId, gate } = input;
    // Staff often paste the value as displayed on the ticket ("#EVB-...") or
    // with spaces inserted by a handheld scanner. Store and compare one
    // canonical representation for both manual entry and QR scans.
    const code = ticketCode.trim().replace(/\s+/g, '').replace(/^#/, '').toUpperCase();

    // Tìm theo ticketCode trong tất cả sự kiện trước
    const regAny = await this.staffRepository.findRegistrationByCodeAnyEvent(code);

    if (!regAny) {
      // Mã vé không tồn tại
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code, result: 'invalid', gate,
      });
      return { result: 'invalid', message: 'Mã vé không hợp lệ hoặc không tồn tại' };
    }

    const participant = regAny.participantId as unknown as { fullName?: string };
    const ticket = regAny.ticketId as unknown as { ticketName?: string };
    const attendeeName = participant.fullName ?? 'Người tham dự';
    const ticketName = ticket.ticketName ?? 'Vé sự kiện';

    if (regAny.eventId.toString() !== eventId) {
      // Vé thuộc sự kiện khác
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code,
        registrationId: (regAny._id as mongoose.Types.ObjectId).toString(),
        result: 'wrong_event', gate,
      });
      return { result: 'wrong_event', message: 'Vé này thuộc sự kiện khác' };
    }

    if (regAny.status === 'CANCELLED' || regAny.status === 'REFUNDED') {
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code,
        registrationId: (regAny._id as mongoose.Types.ObjectId).toString(),
        result: 'cancelled', gate,
      });
      return { result: 'cancelled', message: 'Vé đã bị hủy hoặc hoàn tiền' };
    }

    if (regAny.status !== 'PAID') {
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code,
        registrationId: (regAny._id as mongoose.Types.ObjectId).toString(),
        result: 'invalid', gate,
      });
      return { result: 'invalid', message: 'Vé chưa được thanh toán' };
    }

    if (regAny.checkedIn) {
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code,
        registrationId: (regAny._id as mongoose.Types.ObjectId).toString(),
        result: 'duplicate', gate,
      });
      return {
        result: 'duplicate',
        message: 'Vé này đã được check-in trước đó',
        attendeeName,
        ticketName,
        previousCheckedInAt: regAny.checkedInAt,
      };
    }

    const timingFailure = await this.getCheckInWindowFailure(regAny, eventId);
    if (timingFailure) {
      await this.staffRepository.createCheckInLog({
        eventId,
        staffId,
        ticketCode: code,
        registrationId: (regAny._id as mongoose.Types.ObjectId).toString(),
        result: timingFailure.result,
        gate,
      });
      return timingFailure;
    }

    // Atomic check-in
    const registrationId = (regAny._id as mongoose.Types.ObjectId).toString();
    const updated = await this.staffRepository.completeCheckIn({
      registrationId,
      eventId,
      staffId,
      ticketCode: code,
      gate,
    });
    if (!updated) {
      // Race condition — another scanner got it first
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code,
        registrationId,
        result: 'duplicate', gate,
      });
      return {
        result: 'duplicate',
        message: 'Vé này vừa được check-in bởi trạm khác',
        attendeeName,
        ticketName,
      };
    }

    return {
      result: 'success',
      message: 'Check-in thành công!',
      attendeeName,
      ticketName,
      checkedInAt: updated.checkedInAt,
    };
  }

  async getCheckInStats(eventId: string): Promise<CheckInStats> {
    this.assertValidObjectId(eventId, 'eventId');
    return this.staffRepository.getCheckInStats(eventId);
  }

  async getCheckInHistory(
    eventId: string,
    query: { page?: number; limit?: number }
  ): Promise<PaginatedResult<ICheckInLog>> {
    this.assertValidObjectId(eventId, 'eventId');
    return this.staffRepository.getCheckInHistory(eventId, query);
  }

  // ── Attendees ─────────────────────────────────────────────────────────────────

  async getAttendees(
    eventId: string,
    query: { page?: number; limit?: number; search?: string; checkedIn?: boolean }
  ): Promise<PaginatedResult<IRegistration>> {
    this.assertValidObjectId(eventId, 'eventId');
    return this.staffRepository.getAttendees(eventId, query);
  }

  /** Staff check-in thủ công từ danh sách người tham dự (bypass QR). */
  async manualCheckIn(registrationId: string, staffId: string, eventId: string): Promise<IRegistration> {
    this.assertValidObjectIds(registrationId, staffId, eventId);

    const registration = await this.staffRepository.findRegistrationByIdForEvent(
      registrationId,
      eventId
    );
    if (!registration) {
      throw new AppError('Vé không tồn tại trong sự kiện này', 404);
    }
    if (registration.status !== 'PAID') {
      throw new AppError('Không thể check-in: vé chưa thanh toán hoặc không còn hiệu lực', 400);
    }
    if (registration.checkedIn) {
      throw new AppError('Vé đã được check-in trước đó', 409);
    }

    const timingFailure = await this.getCheckInWindowFailure(registration, eventId);
    if (timingFailure) {
      throw new AppError(timingFailure.message, 400);
    }

    const updated = await this.staffRepository.completeCheckIn({
      registrationId,
      staffId,
      eventId,
      ticketCode: registration.ticketCode ?? registrationId,
      gate: 'Manual',
    });
    if (!updated) {
      throw new AppError('Vé vừa được check-in bởi nhân viên khác', 409);
    }

    return updated;
  }

  // ── Incidents ─────────────────────────────────────────────────────────────────

  async createIncident(input: CreateIncidentInput): Promise<IIncidentReport> {
    this.assertValidObjectId(input.eventId, 'eventId');

    const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const VALID_CATEGORIES = ['security', 'crowd_control', 'equipment', 'medical', 'ticket_dispute', 'other'];

    this.requireString(input.title, 'Tiêu đề sự cố');
    this.requireString(input.description, 'Mô tả sự cố');
    this.requireString(input.location, 'Vị trí xảy ra sự cố');

    if (!VALID_SEVERITIES.includes(input.severity)) {
      throw new AppError(`severity phải là một trong: ${VALID_SEVERITIES.join(', ')}`, 400);
    }
    if (!VALID_CATEGORIES.includes(input.category)) {
      throw new AppError(`category phải là một trong: ${VALID_CATEGORIES.join(', ')}`, 400);
    }

    return this.staffRepository.createIncident(input);
  }

  async getMyIncidents(
    staffId: string,
    query: { page?: number; limit?: number }
  ): Promise<PaginatedResult<IIncidentReport>> {
    return this.staffRepository.findIncidents({ staffId, ...query });
  }

  /** Admin xem toàn bộ sự cố (có thể filter theo eventId, status). */
  async getAllIncidents(
    query: { eventId?: string; status?: IncidentStatus; page?: number; limit?: number }
  ): Promise<PaginatedResult<IIncidentReport>> {
    return this.staffRepository.findIncidents(query);
  }

  async getIncidentById(id: string): Promise<IIncidentReport> {
    this.assertValidObjectId(id, 'incidentId');
    const incident = await this.staffRepository.findIncidentById(id);
    if (!incident) throw new AppError('Báo cáo sự cố không tồn tại', 404);
    return incident;
  }

  async updateIncidentStatus(
    id: string,
    input: UpdateIncidentStatusInput,
    requesterId: string
  ): Promise<IIncidentReport> {
    this.assertValidObjectId(id, 'incidentId');

    const VALID_STATUSES: IncidentStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!VALID_STATUSES.includes(input.status)) {
      throw new AppError(`status phải là một trong: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const extra: { resolvedNote?: string; resolvedAt?: Date; resolvedById?: string } = {};
    if (input.status === 'RESOLVED') {
      extra.resolvedNote = input.resolvedNote;
      extra.resolvedAt = new Date();
      extra.resolvedById = requesterId;
    }

    const updated = await this.staffRepository.updateIncidentStatus(id, input.status, extra);
    if (!updated) throw new AppError('Báo cáo sự cố không tồn tại', 404);
    return updated;
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  private assertValidObjectId(id: string, field: string): void {
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(`${field} không hợp lệ`, 400);
    }
  }

  private assertValidObjectIds(...ids: string[]): void {
    ids.forEach((id, i) => {
      if (!mongoose.isValidObjectId(id)) {
        throw new AppError(`ID không hợp lệ (vị trí ${i + 1})`, 400);
      }
    });
  }

  private requireString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new AppError(`${fieldName} không được để trống`, 400);
    }
    return value.trim();
  }

  private normalizeAssignmentNote(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') {
      throw new AppError('Ghi chú nhiệm vụ phải là chuỗi', 400);
    }
    const note = value.trim();
    if (note.length > 500) {
      throw new AppError('Ghi chú nhiệm vụ không được vượt quá 500 ký tự', 400);
    }
    return note;
  }

  private async getCheckInWindowFailure(
    registration: IRegistration,
    eventId: string,
    now = new Date()
  ): Promise<CheckInWindowFailure | null> {
    const event = await this.staffRepository.findEventById(eventId);
    if (!event) {
      return { result: 'invalid', message: 'Không tìm thấy sự kiện của vé' };
    }

    const ticket = registration.ticketId as unknown as Pick<ITicket, 'showId'>;
    const window = this.resolveCheckInWindow(event, ticket);
    if (!window) {
      return {
        result: 'invalid',
        message: 'Không xác định được thời gian check-in của vé',
      };
    }

    const opensAt = new Date(window.start.getTime() - CHECK_IN_OPEN_BEFORE_MS);
    const closesAt = new Date(window.end.getTime() + CHECK_IN_CLOSE_AFTER_MS);

    if (now < opensAt) {
      return {
        result: 'too_early',
        message: `Chưa đến giờ check-in. Cổng mở lúc ${opensAt.toLocaleString('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        })}`,
      };
    }
    if (now > closesAt) {
      return {
        result: 'event_ended',
        message: 'Đã hết thời gian check-in cho vé này',
      };
    }
    return null;
  }

  private resolveCheckInWindow(
    event: IEvent,
    ticket: Pick<ITicket, 'showId'>
  ): { start: Date; end: Date } | null {
    if (ticket.showId) {
      const show = event.shows?.find(
        (candidate) => candidate._id?.toString() === ticket.showId?.toString()
      );
      if (!show) return null;
      return this.toValidWindow(show.startTime, show.endTime);
    }

    const start = event.startDate ?? event.date;
    const end = event.endDate ?? event.startDate ?? event.date;
    return this.toValidWindow(start, end);
  }

  private toValidWindow(
    startValue: Date | string | undefined,
    endValue: Date | string | undefined
  ): { start: Date; end: Date } | null {
    if (!startValue || !endValue) return null;
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end < start
    ) {
      return null;
    }
    return { start, end };
  }

  private async expireOverdueAssignments(
    assignments: IStaffAssignment[]
  ): Promise<IStaffAssignment[]> {
    return Promise.all(assignments.map(async (assignment) => {
      if (assignment.status !== 'assigned') return assignment;

      const populatedEvent = assignment.eventId as unknown as {
        _id?: mongoose.Types.ObjectId;
        startDate?: Date;
        date?: Date;
      };
      const eventId = populatedEvent._id?.toString() ?? assignment.eventId.toString();
      const event = populatedEvent.startDate || populatedEvent.date
        ? populatedEvent
        : await this.staffRepository.findEventById(eventId);

      if (!event || !this.isConfirmationDeadlinePassed(event)) return assignment;
      return await this.staffRepository.transitionPendingAssignment(
        (assignment._id as mongoose.Types.ObjectId).toString(),
        'expired'
      ) ?? assignment;
    }));
  }

  private isConfirmationDeadlinePassed(event: { startDate?: Date; date?: Date }): boolean {
    const start = event.startDate ?? event.date;
    return Boolean(start && Date.now() >= new Date(start).getTime() - ASSIGNMENT_CONFIRMATION_LEAD_MS);
  }
}
