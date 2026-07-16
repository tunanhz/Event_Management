import mongoose from 'mongoose';
import { StaffRepository } from './staff.repository';
import { IStaffAssignment, AssignmentStatus } from './assignment.model';
import { ICheckInLog } from './checkin-log.model';
import { IIncidentReport, IncidentStatus } from './incident.model';
import { IRegistration } from '../registration/registration.model';
import { AppError } from '../../common/utils/AppError';
import { PaginatedResult } from '../../common/types';
import { CheckInStats } from './staff.repository';
import { ITicket } from '../organizer/ticket.model';

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  eventId: string;
  staffId: string;
  gate: string;
  shift: string;
  responsibility: string;
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

    // Kiểm tra trùng
    const existing = await this.staffRepository.findAssignmentByEventAndStaff(
      input.eventId,
      input.staffId
    );
    if (existing) {
      throw new AppError('Nhân viên này đã được phân công cho sự kiện đó', 409);
    }

    const trimmed = {
      gate: this.requireString(input.gate, 'Cổng phụ trách'),
      shift: this.requireString(input.shift, 'Ca trực'),
      responsibility: this.requireString(input.responsibility, 'Nhiệm vụ'),
    };

    return this.staffRepository.createAssignment({
      ...input,
      ...trimmed,
    });
  }

  /** Lấy danh sách sự kiện được phân công (Staff xem ca trực của mình). */
  async getMyAssignments(staffId: string): Promise<IStaffAssignment[]> {
    return this.staffRepository.findAssignments({ staffId, status: undefined });
  }

  /** Admin xem danh sách staff được phân công cho một sự kiện. */
  async getEventAssignments(eventId: string): Promise<IStaffAssignment[]> {
    this.assertValidObjectId(eventId, 'eventId');
    return this.staffRepository.findAssignments({ eventId });
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

    const updated = await this.staffRepository.updateAssignmentStatus(
      assignmentId,
      'confirmed',
      { confirmedAt: new Date() }
    );
    if (!updated) throw new AppError('Không thể cập nhật trạng thái phân công', 500);
    return updated;
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
    const code = ticketCode.trim().toUpperCase();

    // Tìm theo ticketCode trong tất cả sự kiện trước
    const regAny = await this.staffRepository.findRegistrationByCodeAnyEvent(code);

    if (!regAny) {
      // Mã vé không tồn tại
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code, result: 'invalid', gate,
      });
      return { result: 'invalid', message: 'Mã vé không hợp lệ hoặc không tồn tại' };
    }

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
        previousCheckedInAt: regAny.checkedInAt,
      };
    }

    // Atomic check-in
    const updated = await this.staffRepository.markCheckedIn(
      (regAny._id as mongoose.Types.ObjectId).toString()
    );
    if (!updated) {
      // Race condition — another scanner got it first
      await this.staffRepository.createCheckInLog({
        eventId, staffId, ticketCode: code,
        registrationId: (regAny._id as mongoose.Types.ObjectId).toString(),
        result: 'duplicate', gate,
      });
      return {
        result: 'duplicate',
        message: 'Vé này vừa được check-in bởi trạm khác',
      };
    }

    await this.staffRepository.createCheckInLog({
      eventId, staffId, ticketCode: code,
      registrationId: (updated._id as mongoose.Types.ObjectId).toString(),
      result: 'success', gate,
    });

    return {
      result: 'success',
      message: 'Check-in thành công!',
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

    const updated = await this.staffRepository.markCheckedIn(registrationId);
    if (!updated) {
      throw new AppError('Không thể check-in: vé đã được check-in hoặc không tồn tại', 400);
    }

    await this.staffRepository.createCheckInLog({
      eventId,
      staffId,
      ticketCode: updated.ticketCode ?? registrationId,
      registrationId,
      result: 'success',
      gate: 'Manual',
    });

    return updated;
  }

  // ── Offline Sales ─────────────────────────────────────────────────────────────

  async getEventTickets(eventId: string): Promise<ITicket[]> {
    this.assertValidObjectId(eventId, 'eventId');
    return this.staffRepository.getEventTickets(eventId);
  }

  async sellOfflineTicket(input: {
    eventId: string;
    ticketId: string;
    staffId: string;
    quantity: number;
    participantInfo: { fullName: string; email: string; phone?: string };
  }): Promise<{ ticketCode: string; registrationId: string }> {
    this.assertValidObjectIds(input.eventId, input.ticketId, input.staffId);
    if (input.quantity <= 0) throw new AppError('Số lượng phải lớn hơn 0', 400);
    this.requireString(input.participantInfo.fullName, 'Họ tên khách hàng');
    this.requireString(input.participantInfo.email, 'Email khách hàng');

    // 1. Get ticket
    const ticket = await this.staffRepository.findTicketById(input.ticketId);
    if (!ticket) throw new AppError('Loại vé không tồn tại', 404);
    if (ticket.eventId.toString() !== input.eventId) {
      throw new AppError('Vé không thuộc sự kiện này', 400);
    }
    if (ticket.status !== 'ACTIVE') {
      throw new AppError('Vé hiện không được bán', 400);
    }
    if (ticket.soldQuantity + input.quantity > ticket.quantity) {
      throw new AppError('Số lượng vé còn lại không đủ', 400);
    }

    // 2. Find or create user
    let user = await this.staffRepository.findUserByEmail(input.participantInfo.email);
    if (!user) {
      user = await this.staffRepository.createUser({
        fullName: input.participantInfo.fullName,
        email: input.participantInfo.email,
        phone: input.participantInfo.phone,
      });
    }

    // 3. Generate ticketCode (e.g. OFF-123456)
    const ticketCode = `OFF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 4. Sell ticket (Transaction)
    try {
      const reg = await this.staffRepository.sellOfflineTicket({
        eventId: input.eventId,
        ticketId: input.ticketId,
        participantId: (user._id as mongoose.Types.ObjectId).toString(),
        quantity: input.quantity,
        unitPrice: ticket.price,
        ticketCode,
      });

      return {
        ticketCode: reg.ticketCode!,
        registrationId: (reg._id as mongoose.Types.ObjectId).toString(),
      };
    } catch (err: any) {
      if (err.message.includes('không đủ số lượng')) {
        throw new AppError('Vé đã bán hết hoặc không đủ số lượng', 400);
      }
      throw err;
    }
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
}
