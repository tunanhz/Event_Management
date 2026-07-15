import mongoose from 'mongoose';
import { StaffAssignmentRepository } from './staff-assignment.repository';
import { IStaffAssignment } from './staff-assignment.model';
import { UserRepository } from '../user/user.repository';
import { AppError } from '../../common/utils/AppError';
import { Event } from '../event/event.model';

export class StaffAssignmentService {
  private repo: StaffAssignmentRepository;
  private userRepo: UserRepository;

  constructor() {
    this.repo = new StaffAssignmentRepository();
    this.userRepo = new UserRepository();
  }

  /**
   * Admin assigns a staff member to an event.
   */
  async assignStaff(
    adminId: string,
    data: {
      eventId: string;
      staffId: string;
      roleInEvent: string;
      gate?: string;
      shift?: string;
    }
  ): Promise<IStaffAssignment> {
    const { eventId, staffId, roleInEvent, gate, shift } = data;

    if (!eventId || !staffId || !roleInEvent) {
      throw new AppError('eventId, staffId, and roleInEvent are required', 400);
    }

    if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(staffId)) {
      throw new AppError('ID không hợp lệ', 400);
    }

    // Validate event exists
    const event = await Event.findById(eventId).lean();
    if (!event) {
      throw new AppError('Sự kiện không tồn tại', 404);
    }

    // Validate staff exists and has STAFF role
    const staff = await this.userRepo.findById(staffId);
    if (!staff) {
      throw new AppError('Nhân viên không tồn tại', 404);
    }
    if (staff.role !== 'STAFF') {
      throw new AppError('Chỉ có thể phân công người dùng có vai trò STAFF', 400);
    }

    // Check if already assigned
    const existing = await this.repo.findByEventAndStaff(eventId, staffId);
    if (existing) {
      throw new AppError('Nhân viên này đã được phân công cho sự kiện này', 409);
    }

    return this.repo.create({
      eventId: new mongoose.Types.ObjectId(eventId) as any,
      staffId: new mongoose.Types.ObjectId(staffId) as any,
      roleInEvent: roleInEvent.trim(),
      gate: gate?.trim(),
      shift: shift?.trim(),
    });
  }

  /**
   * Admin removes a staff assignment.
   */
  async removeStaff(adminId: string, eventId: string, staffId: string): Promise<void> {
    if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(staffId)) {
      throw new AppError('ID không hợp lệ', 400);
    }

    const removed = await this.repo.removeByEventAndStaff(eventId, staffId);
    if (!removed) {
      throw new AppError('Không tìm thấy phân công để xóa', 404);
    }
  }

  /**
   * Admin gets all staff assigned to an event.
   */
  async getByEvent(eventId: string): Promise<IStaffAssignment[]> {
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }
    return this.repo.findByEvent(eventId);
  }

  /**
   * Staff views their assigned events (with event details populated).
   */
  async getMyAssignments(staffId: string): Promise<IStaffAssignment[]> {
    return this.repo.findByStaff(staffId);
  }

  /**
   * Admin updates assignment details (role, gate, shift).
   */
  async updateAssignment(
    eventId: string,
    staffId: string,
    update: { roleInEvent?: string; gate?: string; shift?: string }
  ): Promise<IStaffAssignment> {
    if (!mongoose.isValidObjectId(eventId) || !mongoose.isValidObjectId(staffId)) {
      throw new AppError('ID không hợp lệ', 400);
    }

    const assignment = await this.repo.findByEventAndStaff(eventId, staffId);
    if (!assignment) {
      throw new AppError('Không tìm thấy phân công', 404);
    }

    if (update.roleInEvent !== undefined) assignment.roleInEvent = update.roleInEvent.trim();
    if (update.gate !== undefined) assignment.gate = update.gate.trim();
    if (update.shift !== undefined) assignment.shift = update.shift.trim();

    return assignment.save();
  }
}
