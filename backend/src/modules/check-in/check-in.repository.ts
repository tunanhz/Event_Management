import { CheckIn, ICheckIn } from './check-in.model';

export class CheckInRepository {
  async create(data: Partial<ICheckIn>): Promise<ICheckIn> {
    return CheckIn.create(data);
  }

  /** Find the most recent successful check-in for a registration. */
  async findSuccessByRegistration(registrationId: string): Promise<ICheckIn | null> {
    return CheckIn.findOne({ registrationId, status: 'SUCCESS' }).lean();
  }

  /** Recent check-in history for an event, newest first. */
  async getHistoryByEvent(eventId: string, limit = 50): Promise<ICheckIn[]> {
    return CheckIn.find({ eventId, status: 'SUCCESS' })
      .populate('registrationId', 'participantId ticketId quantity')
      .populate('staffId', 'fullName')
      .sort({ checkInTime: -1 })
      .limit(limit);
  }

  /** Count successful check-ins for an event. */
  async countSuccessByEvent(eventId: string): Promise<number> {
    return CheckIn.countDocuments({ eventId, status: 'SUCCESS' });
  }

  /** Get distinct registration IDs that have been checked in for an event. */
  async getCheckedInRegistrationIds(eventId: string): Promise<string[]> {
    const docs = await CheckIn.find({ eventId, status: 'SUCCESS' })
      .select('registrationId')
      .lean();
    return docs.map((d) => String(d.registrationId));
  }
}
