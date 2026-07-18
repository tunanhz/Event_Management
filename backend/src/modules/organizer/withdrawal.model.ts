import mongoose, { Schema, Document } from 'mongoose';

/**
 * Withdrawal — organizer's post-event payout request (ERD: Withdrawal:
 * organizerId, approvedBy, amount, requestDate, approvedAt, status,
 * rejectionReason; the physical ERD also carries eventId + note, which the
 * per-event withdrawal screen needs). The bank* fields are additive beyond
 * the ERD — a snapshot of the payout account entered on the request form, so
 * later edits to Event.paymentInfo can't silently retarget an old request
 * (same additive pattern as Registration's PENDING/EXPIRED statuses).
 * Organizer creates PENDING requests; ADMIN approval/rejection comes with the
 * admin payout feature and will set approvedBy/approvedAt/rejectionReason.
 */
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IWithdrawal extends Document {
  organizerId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  amount: number;
  requestDate: Date;
  status: WithdrawalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  note?: string;
  // Payout account snapshot (additive).
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    amount: { type: Number, required: true, min: 1 },
    requestDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    note: { type: String, trim: true, maxlength: 500 },
    bankName: { type: String, required: true, trim: true, maxlength: 100 },
    accountNumber: { type: String, required: true, trim: true, maxlength: 30 },
    accountHolder: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { timestamps: true }
);

withdrawalSchema.index({ eventId: 1, requestDate: -1 });
withdrawalSchema.index({ organizerId: 1 });
withdrawalSchema.index({ status: 1 });

export const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);
