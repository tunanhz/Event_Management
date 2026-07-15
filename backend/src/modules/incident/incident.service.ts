import mongoose from 'mongoose';
import { IncidentRepository } from './incident.repository';
import { IIncident, INCIDENT_TYPES, IncidentType, IncidentStatus } from './incident.model';
import { StaffAssignmentRepository } from '../staff-assignment/staff-assignment.repository';
import { AppError } from '../../common/utils/AppError';

const VALID_STATUSES: IncidentStatus[] = ['PENDING', 'IN_REVIEW', 'RESOLVED'];

export class IncidentService {
  private repo: IncidentRepository;
  private assignmentRepo: StaffAssignmentRepository;

  constructor() {
    this.repo = new IncidentRepository();
    this.assignmentRepo = new StaffAssignmentRepository();
  }

  /**
   * Staff creates an incident report.
   */
  async createIncident(
    staffId: string,
    data: {
      eventId: string;
      type: string;
      ticketCode?: string;
      description: string;
    }
  ): Promise<IIncident> {
    const { eventId, type, ticketCode, description } = data;

    if (!eventId || !type || !description?.trim()) {
      throw new AppError('eventId, type, và description là bắt buộc', 400);
    }

    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }

    if (!INCIDENT_TYPES.includes(type as IncidentType)) {
      throw new AppError(`type phải là một trong: ${INCIDENT_TYPES.join(', ')}`, 400);
    }

    // Verify staff is assigned to this event
    const isAssigned = await this.assignmentRepo.isStaffAssignedToEvent(staffId, eventId);
    if (!isAssigned) {
      throw new AppError('Bạn không được phân công cho sự kiện này', 403);
    }

    return this.repo.create({
      eventId: new mongoose.Types.ObjectId(eventId) as any,
      reportedBy: new mongoose.Types.ObjectId(staffId) as any,
      type: type as IncidentType,
      ticketCode: ticketCode?.trim(),
      description: description.trim(),
    });
  }

  /**
   * Staff views their own incident reports.
   */
  async getMyIncidents(staffId: string): Promise<IIncident[]> {
    return this.repo.findByStaff(staffId);
  }

  /**
   * Admin views incidents for a specific event.
   */
  async getByEvent(eventId: string): Promise<IIncident[]> {
    if (!mongoose.isValidObjectId(eventId)) {
      throw new AppError('eventId không hợp lệ', 400);
    }
    return this.repo.findByEvent(eventId);
  }

  /**
   * Admin views all incidents (optional status filter).
   */
  async getAll(filter?: { status?: string }): Promise<IIncident[]> {
    return this.repo.findAll(filter);
  }

  /**
   * Admin updates incident status (and optionally resolution).
   */
  async updateStatus(
    adminId: string,
    incidentId: string,
    data: { status: string; resolution?: string }
  ): Promise<IIncident> {
    if (!mongoose.isValidObjectId(incidentId)) {
      throw new AppError('incidentId không hợp lệ', 400);
    }

    if (!VALID_STATUSES.includes(data.status as IncidentStatus)) {
      throw new AppError(`status phải là một trong: ${VALID_STATUSES.join(', ')}`, 400);
    }

    const update: any = { status: data.status };

    if (data.status === 'RESOLVED') {
      update.resolvedBy = new mongoose.Types.ObjectId(adminId);
      update.resolvedAt = new Date();
      if (data.resolution) update.resolution = data.resolution.trim();
    }

    const updated = await this.repo.updateStatus(incidentId, update);
    if (!updated) {
      throw new AppError('Không tìm thấy báo cáo sự cố', 404);
    }

    return updated;
  }
}
