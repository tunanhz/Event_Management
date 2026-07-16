import mongoose, { Schema, Document } from 'mongoose';

/**
 * StaffAssignment — a STAFF user allocated to work an event (ERD:
 * StaffAssignment: eventId, staffId, roleInEvent, status, assignedAt).
 * Per business.md §2.1 the ADMIN assigns staff; the organizer module only
 * reads these for the event "Thành viên" (members) view. The admin
 * assignment endpoints will own writes when that feature lands.
 */
export type StaffAssignmentStatus = 'ASSIGNED' | 'CONFIRMED' | 'CANCELLED';

export interface IStaffAssignment extends Document {
  eventId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  /** Duty at the event, e.g. "Check-in", "Bán vé", "Hỗ trợ". */
  roleInEvent: string;
  status: StaffAssignmentStatus;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffAssignmentSchema = new Schema<IStaffAssignment>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleInEvent: { type: String, required: true, trim: true, maxlength: 80 },
    status: {
      type: String,
      enum: ['ASSIGNED', 'CONFIRMED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

staffAssignmentSchema.index({ eventId: 1 });
staffAssignmentSchema.index({ staffId: 1 });
// One active assignment per staff per event.
staffAssignmentSchema.index({ eventId: 1, staffId: 1 }, { unique: true });

export const StaffAssignment = mongoose.model<IStaffAssignment>(
  'StaffAssignment',
  staffAssignmentSchema
);
