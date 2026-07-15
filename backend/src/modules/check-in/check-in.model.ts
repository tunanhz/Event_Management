import mongoose, { Schema, Document } from 'mongoose';

export type CheckInStatus = 'SUCCESS' | 'DUPLICATE' | 'INVALID';

export interface ICheckIn extends Document {
  registrationId: mongoose.Types.ObjectId;
  /** Staff member who performed the check-in. */
  staffId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  checkInTime: Date;
  status: CheckInStatus;
  /** Optional note by the staff member. */
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const checkInSchema = new Schema<ICheckIn>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    checkInTime: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['SUCCESS', 'DUPLICATE', 'INVALID'],
      required: true,
    },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

checkInSchema.index({ registrationId: 1 });
checkInSchema.index({ eventId: 1, checkInTime: -1 });
checkInSchema.index({ staffId: 1, checkInTime: -1 });

export const CheckIn = mongoose.model<ICheckIn>('CheckIn', checkInSchema);
