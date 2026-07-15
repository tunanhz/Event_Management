import mongoose from 'mongoose';
import { StaffAssignment, IStaffAssignment } from './staff-assignment.model';

export class StaffAssignmentRepository {
  async create(data: Partial<IStaffAssignment>): Promise<IStaffAssignment> {
    return StaffAssignment.create(data);
  }

  async findByEventAndStaff(eventId: string, staffId: string): Promise<IStaffAssignment | null> {
    return StaffAssignment.findOne({ eventId, staffId, status: 'ACTIVE' });
  }

  async findByEvent(eventId: string): Promise<IStaffAssignment[]> {
    return StaffAssignment.find({ eventId, status: 'ACTIVE' })
      .populate('staffId', 'fullName email phone avatar')
      .sort({ assignedAt: -1 });
  }

  async findByStaff(staffId: string): Promise<IStaffAssignment[]> {
    return StaffAssignment.find({ staffId, status: 'ACTIVE' })
      .populate({
        path: 'eventId',
        select: 'title description date startDate endDate location imageUrl banner status reviewStatus',
      })
      .sort({ assignedAt: -1 });
  }

  async removeByEventAndStaff(eventId: string, staffId: string): Promise<IStaffAssignment | null> {
    return StaffAssignment.findOneAndUpdate(
      { eventId, staffId, status: 'ACTIVE' },
      { status: 'REMOVED' },
      { new: true }
    );
  }

  async countByEvent(eventId: string): Promise<number> {
    return StaffAssignment.countDocuments({ eventId, status: 'ACTIVE' });
  }

  async isStaffAssignedToEvent(staffId: string, eventId: string): Promise<boolean> {
    const doc = await StaffAssignment.findOne({ staffId, eventId, status: 'ACTIVE' }).lean();
    return !!doc;
  }
}
