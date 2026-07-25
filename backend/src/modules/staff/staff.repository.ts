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
      .populate('eventId', 'title banner imageUrl location date startDate endDate status')
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

  async findSchedulingAssignmentsForStaff(
    staffId: string,
    statuses: AssignmentStatus[],
    excludeEventId?: string
  ): Promise<IStaffAssignment[]> {
    const eventFilter = excludeEventId
      ? { $ne: new mongoose.Types.ObjectId(excludeEventId) }
      : undefined;

    return StaffAssignment.find({
      staffId: new mongoose.Types.ObjectId(staffId),
      status: { $in: statuses },
      ...(eventFilter ? { eventId: eventFilter } : {}),
    })
      .populate('eventId', 'title date startDate endDate shows status')
      .lean();
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

  async updateAssignmentNote(
    id: string,
    eventId: string,
    note: string
  ): Promise<IStaffAssignment | null> {
    return StaffAssignment.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        eventId: new mongoose.Types.ObjectId(eventId),
      },
      { note },
      { new: true }
    )
      .populate('eventId', 'title banner imageUrl location date startDate endDate status')
      .populate('staffId', 'fullName email avatar')
      .lean();
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
      .populate('eventId', 'title banner imageUrl location date startDate endDate status')
      .populate('staffId', 'fullName email avatar')
      .lean();
  }

  async transitionPendingAssignment(
    id: string,
    status: 'confirmed' | 'expired',
    confirmedAt?: Date
  ): Promise<IStaffAssignment | null> {
    return StaffAssignment.findOneAndUpdate(
      { _id: id, status: 'assigned' },
      { status, ...(confirmedAt ? { confirmedAt } : {}) },
      { new: true }
    )
      .populate('eventId', 'title banner imageUrl location date startDate endDate status')
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
    const normalizedCode = ticketCode.trim().toUpperCase();
    const registration = await Registration.findOne({
      ticketCode: normalizedCode,
    })
      .populate('participantId', 'fullName email')
      .populate('ticketId', 'ticketName price showId')
      .lean();
    if (registration) return registration;

    // Before ticketCode was persisted, "Vé của tôi" rendered EVB-{last 6
    // ObjectId chars}. Keep those already-issued QR screenshots/prints usable
    // until the production backfill has been explicitly approved and run.
    const legacyMatch = /^EVB-([A-F0-9]{6})$/.exec(normalizedCode);
    if (!legacyMatch) return null;

    return Registration.findOne({
      status: 'PAID',
      $or: [
        { ticketCode: { $exists: false } },
        { ticketCode: null },
        { ticketCode: '' },
      ],
      $expr: {
        $eq: [
          {
            $toUpper: {
              $substrBytes: [{ $toString: '$_id' }, 18, 6],
            },
          },
          legacyMatch[1],
        ],
      },
    })
      .populate('participantId', 'fullName email')
      .populate('ticketId', 'ticketName price showId')
      .lean();
  }

  /** Read a registration only inside the event currently operated by Staff. */
  async findRegistrationByIdForEvent(
    registrationId: string,
    eventId: string
  ): Promise<IRegistration | null> {
    return Registration.findOne({
      _id: new mongoose.Types.ObjectId(registrationId),
      eventId: new mongoose.Types.ObjectId(eventId),
    })
      .populate('ticketId', 'ticketName price showId')
      .lean();
  }

  /**
   * Atomically update the paid registration and append its canonical SUCCESS
   * audit row. The event/status/duplicate guards are part of the update query,
   * so a caller cannot check in a registration from another event.
   */
  async completeCheckIn(data: {
    registrationId: string;
    eventId: string;
    staffId: string;
    ticketCode: string;
    gate?: string;
  }): Promise<IRegistration | null> {
    const session = await mongoose.startSession();
    let updated: IRegistration | null = null;

    try {
      await session.withTransaction(async () => {
        const checkedInAt = new Date();
        updated = await Registration.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(data.registrationId),
            eventId: new mongoose.Types.ObjectId(data.eventId),
            status: 'PAID',
            checkedIn: { $ne: true },
          },
          { $set: { checkedIn: true, checkedInAt } },
          { new: true, session }
        );

        if (!updated) return;

        await this.createCheckInLog(
          {
            eventId: data.eventId,
            staffId: data.staffId,
            ticketCode: data.ticketCode,
            registrationId: data.registrationId,
            result: 'success',
            gate: data.gate,
          },
          session
        );
      });

      return updated;
    } catch (error) {
      // Local development in this repository defaults to a standalone mongod,
      // which does not support transactions. Keep the same guarded update and
      // compensate it if the audit write fails; Atlas/replica-set deployments
      // continue to use the transaction path above.
      if (this.isTransactionUnsupported(error)) {
        return this.completeCheckInWithCompensation(data);
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async completeCheckInWithCompensation(data: {
    registrationId: string;
    eventId: string;
    staffId: string;
    ticketCode: string;
    gate?: string;
  }): Promise<IRegistration | null> {
    const checkedInAt = new Date();
    const guardedFilter = {
      _id: new mongoose.Types.ObjectId(data.registrationId),
      eventId: new mongoose.Types.ObjectId(data.eventId),
      status: 'PAID' as const,
      checkedIn: { $ne: true },
    };
    const updated = await Registration.findOneAndUpdate(
      guardedFilter,
      { $set: { checkedIn: true, checkedInAt } },
      { new: true }
    );
    if (!updated) return null;

    try {
      await this.createCheckInLog({
        eventId: data.eventId,
        staffId: data.staffId,
        ticketCode: data.ticketCode,
        registrationId: data.registrationId,
        result: 'success',
        gate: data.gate,
      });
      return updated;
    } catch (error) {
      // Roll back only the exact update performed above; never undo a newer
      // successful check-in written by another request.
      await Registration.updateOne(
        {
          _id: guardedFilter._id,
          eventId: guardedFilter.eventId,
          checkedIn: true,
          checkedInAt,
        },
        { $set: { checkedIn: false }, $unset: { checkedInAt: 1 } }
      );
      throw error;
    }
  }

  private isTransactionUnsupported(error: unknown): boolean {
    const mongoError = error as { code?: number; message?: string };
    return (
      mongoError?.code === 20 ||
      /transaction numbers are only allowed|replica set member|mongos/i.test(
        mongoError?.message ?? ''
      )
    );
  }

  async createCheckInLog(data: {
    eventId: string;
    staffId: string;
    ticketCode: string;
    registrationId?: string;
    result: ICheckInLog['result'];
    gate?: string;
  }, session?: mongoose.ClientSession): Promise<ICheckInLog> {
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
    return log.save({ session });
  }

  async getCheckInStats(eventId: string): Promise<CheckInStats> {
    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    const paidRegistrationIds = await Registration.distinct('_id', {
      eventId: eventObjectId,
      status: 'PAID',
    });
    const total = paidRegistrationIds.length;
    const checkedIn = await CheckInLog.countDocuments({
      eventId: eventObjectId,
      registrationId: { $in: paidRegistrationIds },
      result: 'success',
    });
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
