import mongoose, { Schema, Document } from 'mongoose';

export type RegistrationStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'REFUNDED';

export interface IRegistration extends Document {
  participantId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  registerDate: Date;
  status: RegistrationStatus;
  holdExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const registrationSchema = new Schema<IRegistration>(
  {
    participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    registerDate: { type: Date, default: Date.now },
    // PENDING/EXPIRED extend the SDS enum (PAID|CANCELLED|REFUNDED) additively to support
    // the 10-minute hold-before-payment flow (docs/business.md §8) — a registration only
    // reaches a "final" SDS status once payment is confirmed, cancelled, or the hold lapses.
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED'],
      default: 'PENDING',
    },
    holdExpiresAt: { type: Date },
  },
  { timestamps: true }
);

registrationSchema.index({ participantId: 1, createdAt: -1 });
registrationSchema.index({ eventId: 1 });
registrationSchema.index({ ticketId: 1 });
registrationSchema.index({ status: 1, holdExpiresAt: 1 });

export const Registration = mongoose.model<IRegistration>('Registration', registrationSchema);
