import { Incident, IIncident } from './incident.model';

export class IncidentRepository {
  async create(data: Partial<IIncident>): Promise<IIncident> {
    return Incident.create(data);
  }

  async findById(id: string): Promise<IIncident | null> {
    return Incident.findById(id)
      .populate('eventId', 'title')
      .populate('reportedBy', 'fullName email')
      .populate('resolvedBy', 'fullName');
  }

  /** Incidents filed by a specific staff member, newest first. */
  async findByStaff(staffId: string): Promise<IIncident[]> {
    return Incident.find({ reportedBy: staffId })
      .populate('eventId', 'title')
      .sort({ createdAt: -1 });
  }

  /** Incidents for a specific event, newest first. */
  async findByEvent(eventId: string): Promise<IIncident[]> {
    return Incident.find({ eventId })
      .populate('reportedBy', 'fullName email')
      .populate('resolvedBy', 'fullName')
      .sort({ createdAt: -1 });
  }

  /** All incidents (admin overview), optionally filtered by status. */
  async findAll(filter?: { status?: string }): Promise<IIncident[]> {
    const query: any = {};
    if (filter?.status) query.status = filter.status;

    return Incident.find(query)
      .populate('eventId', 'title')
      .populate('reportedBy', 'fullName email')
      .populate('resolvedBy', 'fullName')
      .sort({ createdAt: -1 });
  }

  async updateStatus(
    id: string,
    update: Partial<IIncident>
  ): Promise<IIncident | null> {
    return Incident.findByIdAndUpdate(id, update, { new: true })
      .populate('eventId', 'title')
      .populate('reportedBy', 'fullName email')
      .populate('resolvedBy', 'fullName');
  }
}
