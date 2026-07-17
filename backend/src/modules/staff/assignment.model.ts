import mongoose, { Schema, Document } from 'mongoose';

export type AssignmentStatus = 'assigned' | 'confirmed' | 'completed' | 'cancelled';

export interface IStaffAssignment extends Document {
  eventId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  /** Cổng phụ trách: "Cổng A", "Cổng VIP", v.v. */
  gate: string;
  /** Khung giờ làm việc: "08:00 - 12:00" */
  shift: string;
  /** Nhiệm vụ chính: "Soát vé", "Hỗ trợ khách", "Điều phối cổng" */
  responsibility: string;
  status: AssignmentStatus;
  note?: string;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IStaffAssignment>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    gate: { type: String, required: true, trim: true },
    shift: { type: String, required: true, trim: true },
    responsibility: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['assigned', 'confirmed', 'completed', 'cancelled'],
      default: 'assigned',
    },
    note: { type: String, trim: true },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

assignmentSchema.index({ staffId: 1, status: 1 });
assignmentSchema.index({ eventId: 1 });
// Mỗi staff chỉ được phân công một lần cho một sự kiện
assignmentSchema.index({ eventId: 1, staffId: 1 }, { unique: true });

export const StaffAssignment = mongoose.model<IStaffAssignment>('StaffAssignment', assignmentSchema);
