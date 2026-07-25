import mongoose, { Schema, Document } from 'mongoose';

export type CheckInResult =
  | 'success'
  | 'duplicate'
  | 'invalid'
  | 'wrong_event'
  | 'cancelled'
  | 'too_early'
  | 'event_ended';

export interface ICheckInLog extends Document {
  eventId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  /** Mã vé đã quét (raw input từ scanner hoặc nhập tay) */
  ticketCode: string;
  /** Registration tương ứng — null nếu mã vé không hợp lệ */
  registrationId?: mongoose.Types.ObjectId;
  result: CheckInResult;
  /** Cổng check-in staff đang đứng (lấy từ Assignment.gate) */
  gate?: string;
  checkedInAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const checkInLogSchema = new Schema<ICheckInLog>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ticketCode: { type: String, required: true, trim: true, uppercase: true },
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration' },
    result: {
      type: String,
      enum: [
        'success',
        'duplicate',
        'invalid',
        'wrong_event',
        'cancelled',
        'too_early',
        'event_ended',
      ],
      required: true,
    },
    gate: { type: String, trim: true },
    checkedInAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

checkInLogSchema.index({ eventId: 1, checkedInAt: -1 });
checkInLogSchema.index({ staffId: 1, checkedInAt: -1 });
checkInLogSchema.index({ ticketCode: 1, eventId: 1 });
// CheckInLog is the canonical check-in attempt/audit store. A registration may
// have many failed attempts, but exactly one successful check-in.
checkInLogSchema.index(
  { registrationId: 1 },
  { unique: true, partialFilterExpression: { result: 'success' } }
);

export const CheckInLog = mongoose.model<ICheckInLog>('CheckInLog', checkInLogSchema);
