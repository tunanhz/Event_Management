import mongoose, { Schema, Document } from 'mongoose';

/**
 * CheckIn — attendance record for one registration (ERD: CheckIn).
 * Co-located with Registration/Payment since it is a child of Registration,
 * same as payment.model.ts. Writes will come from the STAFF check-in flow;
 * the organizer module currently only reads these for the attendance report.
 * Status values follow the SDS CheckIn model: SUCCESS | FAILED | INVALID.
 */
export type CheckInStatus = 'SUCCESS' | 'FAILED' | 'INVALID';

export interface ICheckIn extends Document {
  registrationId: mongoose.Types.ObjectId;
  checkInTime: Date;
  status: CheckInStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const checkInSchema = new Schema<ICheckIn>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    checkInTime: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'INVALID'],
      default: 'SUCCESS',
    },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// One registration may carry several attempts (FAILED then SUCCESS); readers
// treat "has a SUCCESS row" as checked-in. The staff module enforces dedupe.
checkInSchema.index({ registrationId: 1 });

export const CheckIn = mongoose.model<ICheckIn>('CheckIn', checkInSchema);
