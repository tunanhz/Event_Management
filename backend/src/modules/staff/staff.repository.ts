import mongoose from 'mongoose';
import { StaffAssignment, IStaffAssignment, AssignmentStatus } from './assignment.model';
import { CheckInLog, ICheckInLog } from './checkin-log.model';
import { IncidentReport, IIncidentReport, IncidentStatus } from './incident.model';
import { Registration, IRegistration } from '../registration/registration.model';
import { ITicket } from '../organizer/ticket.model';
import { Event, IEvent } from '../event/event.model';
import { PaginatedResult } from '../../common/types';

// ─── Assignment ──────────────────────────────────────────────────────────────

export interface AssignmentQuery {
  staffId?: string;
  eventId?: string;
  status?: AssignmentStatus;
}

// ─── Attendees ───────────────────────────────────────────────────────────────

export interface AttendeeRow {
  registrationId: string;
  ticketCode: string;
  attendeeName: string;
  email: string;
  ticketName: string;
  ticketType: string;
  quantity: number;
  unitPrice: number;
  checkedIn: boolean;
  checkedInAt?: Date;
}

// ─── CheckIn Stats ───────────────────────────────────────────────────────────

export interface CheckInStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percent: number;
}

export class StaffRepository {
  // ── Assignments ────────────────────────────────────────────────────────────

  async findAssignments(query: AssignmentQuery): Promise<IStaffAssignment[]> {
    const filter: Record<string, any> = {};
    if (query.staffId) filter.staffId = new mongoose.Types.ObjectId(query.staffId);
    if (query.eventId) filter.eventId = new mongoose.Types.ObjectId(query.eventId);
    if (query.status) filter.status = query.status;

    return StaffAssignment.find(filter)
      .populate('eventId', 'title banner imageUrl location startDate endDate status')
      .populate('staffId', 'fullName email avatar')
      .sort({ createdAt: -1 })
      .lean();
  }

  async findAssignmentById(id: string): Promise<IStaffAssignment | null> {
    // Keep references as ObjectIds here. The service uses staffId for the
    // ownership check before allowing a shift to be confirmed.
    return StaffAssignment.findById(id).lean();
  }

  async findAssignmentByEventAndStaff(
    eventId: string,
    staffId: string
  ): Promise<IStaffAssignment | null> {
    return StaffAssignment.findOne({
      eventId: new mongoose.Types.ObjectId(eventId),
      staffId: new mongoose.Types.ObjectId(staffId),
    }).lean();
  }

  async createAssignment(data: {
    eventId: string;
    staffId: string;
    gate: string;
    shift: string;
    responsibility: string;
    note?: string;
  }): Promise<IStaffAssignment> {
    const doc = new StaffAssignment({
      eventId: new mongoose.Types.ObjectId(data.eventId),
      staffId: new mongoose.Types.ObjectId(data.staffId),
      gate: data.gate.trim(),
      shift: data.shift.trim(),
      responsibility: data.responsibility.trim(),
      note: data.note?.trim(),
      status: 'assigned',
    });
    return doc.save();
  }

  async updateAssignmentStatus(
    id: string,
    status: AssignmentStatus,
    extra?: { confirmedAt?: Date }
  ): Promise<IStaffAssignment | null> {
    return StaffAssignment.findByIdAndUpdate(
      id,
      { status, ...extra },
      { new: true }
    )
      .populate('eventId', 'title banner imageUrl location startDate endDate status')
      .populate('staffId', 'fullName email avatar')
      .lean();
  }

  async deleteAssignment(id: string): Promise<IStaffAssignment | null> {
    return StaffAssignment.findByIdAndDelete(id).lean();
  }

  async findEventById(eventId: string): Promise<IEvent | null> {
    return Event.findById(eventId).lean();
  }

  // ── Check-in ───────────────────────────────────────────────────────────────

  /** Look up Registration + Ticket by ticketCode (case-insensitive) for a specific event. */
  async findRegistrationByCode(
    ticketCode: string,
    eventId: string
  ): Promise<(IRegistration & { ticketId: ITicket }) | null> {
    // ticketCode is stored on Payment; we link via Registration
    // ticketCode field must exist on Registration — add it there if missing
    return (Registration.findOne({
      ticketCode: ticketCode.trim().toUpperCase(),
      eventId: new mongoose.Types.ObjectId(eventId),
    })
      .populate<{ ticketId: ITicket }>('ticketId', 'ticketName price')
      .lean()) as any;
  }

  async findRegistrationByCodeAnyEvent(
    ticketCode: string
  ): Promise<IRegistration | null> {
    return Registration.findOne({
      ticketCode: ticketCode.trim().toUpperCase(),
    }).lean();
  }

  /** Mark registration as checked-in atomically; returns null if already checked. */
  async markCheckedIn(registrationId: string): Promise<IRegistration | null> {
    return Registration.findOneAndUpdate(
      { _id: registrationId, checkedIn: { $ne: true } },
      { checkedIn: true, checkedInAt: new Date() },
      { new: true }
    );
  }

  async createCheckInLog(data: {
    eventId: string;
    staffId: string;
    ticketCode: string;
    registrationId?: string;
    result: ICheckInLog['result'];
    gate?: string;
  }): Promise<ICheckInLog> {
    const log = new CheckInLog({
      eventId: new mongoose.Types.ObjectId(data.eventId),
      staffId: new mongoose.Types.ObjectId(data.staffId),
      ticketCode: data.ticketCode.trim().toUpperCase(),
      registrationId: data.registrationId
        ? new mongoose.Types.ObjectId(data.registrationId)
        : undefined,
      result: data.result,
      gate: data.gate?.trim(),
      checkedInAt: new Date(),
    });
    return log.save();
  }

  async getCheckInStats(eventId: string): Promise<CheckInStats> {
    const [total, checkedIn] = await Promise.all([
      Registration.countDocuments({
        eventId: new mongoose.Types.ObjectId(eventId),
        status: 'PAID',
      }),
      Registration.countDocuments({
        eventId: new mongoose.Types.ObjectId(eventId),
        status: 'PAID',
        checkedIn: true,
      }),
    ]);
    const remaining = total - checkedIn;
    const percent = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    return { total, checkedIn, remaining, percent };
  }

  async getCheckInHistory(
    eventId: string,
    query: { page?: number; limit?: number }
  ): Promise<PaginatedResult<ICheckInLog>> {
    const { page = 1, limit = 50 } = query;
    const filter = {
      eventId: new mongoose.Types.ObjectId(eventId),
      result: 'success' as const,
    };
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      CheckInLog.find(filter)
        .sort({ checkedInAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CheckInLog.countDocuments(filter),
    ]);

    return {
      data: data as ICheckInLog[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  // ── Attendees ──────────────────────────────────────────────────────────────

  async getAttendees(
    eventId: string,
    query: { page?: number; limit?: number; search?: string; checkedIn?: boolean }
  ): Promise<PaginatedResult<IRegistration>> {
    const { page = 1, limit = 20, search, checkedIn } = query;
    const filter: Record<string, any> = {
      eventId: new mongoose.Types.ObjectId(eventId),
      status: 'PAID',
    };

    if (checkedIn !== undefined) filter.checkedIn = checkedIn;

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      Registration.find(filter)
        .populate('participantId', 'fullName email avatar phone')
        .populate('ticketId', 'ticketName price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Registration.countDocuments(filter),
    ]);

    return {
      data: data as IRegistration[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  // ── Incidents ──────────────────────────────────────────────────────────────

  async createIncident(data: {
    eventId: string;
    staffId: string;
    title: string;
    description: string;
    location: string;
    severity: IIncidentReport['severity'];
    category: IIncidentReport['category'];
    attachments?: string[];
  }): Promise<IIncidentReport> {
    const incident = new IncidentReport({
      eventId: new mongoose.Types.ObjectId(data.eventId),
      staffId: new mongoose.Types.ObjectId(data.staffId),
      title: data.title.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      severity: data.severity,
      category: data.category,
      attachments: data.attachments ?? [],
      status: 'OPEN',
    });
    return incident.save();
  }

  async findIncidents(query: {
    staffId?: string;
    eventId?: string;
    status?: IncidentStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<IIncidentReport>> {
    const { page = 1, limit = 20, staffId, eventId, status } = query;
    const filter: Record<string, any> = {};
    if (staffId) filter.staffId = new mongoose.Types.ObjectId(staffId);
    if (eventId) filter.eventId = new mongoose.Types.ObjectId(eventId);
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      IncidentReport.find(filter)
        .populate('staffId', 'fullName email avatar')
        .populate('eventId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      IncidentReport.countDocuments(filter),
    ]);

    return {
      data: data as IIncidentReport[],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit,
      },
    };
  }

  async findIncidentById(id: string): Promise<IIncidentReport | null> {
    return IncidentReport.findById(id)
      .populate('staffId', 'fullName email avatar')
      .populate('eventId', 'title')
      .lean();
  }

  async updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    extra?: { resolvedNote?: string; resolvedAt?: Date; resolvedById?: string }
  ): Promise<IIncidentReport | null> {
    const update: Record<string, any> = { status };
    if (extra?.resolvedNote) update.resolvedNote = extra.resolvedNote;
    if (extra?.resolvedAt) update.resolvedAt = extra.resolvedAt;
    if (extra?.resolvedById)
      update.resolvedById = new mongoose.Types.ObjectId(extra.resolvedById);

    return IncidentReport.findByIdAndUpdate(id, update, { new: true }).lean();
  }
}
