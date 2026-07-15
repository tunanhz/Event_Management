import mongoose, { Schema, Document } from 'mongoose';

export interface IStaffAssignment extends Document {
  eventId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  /** Role at the event, e.g. "Soát vé cổng chính", "Bán vé offline". */
  roleInEvent: string;
  /** Gate / station, e.g. "Cổng A". */
  gate?: string;
  /** Working shift window, e.g. "18:00 – 22:00". */
  shift?: string;
  status: 'ACTIVE' | 'REMOVED';
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffAssignmentSchema = new Schema<IStaffAssignment>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleInEvent: { type: String, required: true, trim: true },
    gate: { type: String, trim: true },
    shift: { type: String, trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'REMOVED'],
      default: 'ACTIVE',
    },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

staffAssignmentSchema.index({ eventId: 1, staffId: 1 }, { unique: true });
staffAssignmentSchema.index({ staffId: 1 });
staffAssignmentSchema.index({ eventId: 1, status: 1 });

export const StaffAssignment = mongoose.model<IStaffAssignment>('StaffAssignment', staffAssignmentSchema);
