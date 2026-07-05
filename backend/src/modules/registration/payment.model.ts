import mongoose, { Schema, Document } from 'mongoose';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface IPayment extends Document {
  registrationId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: string;
  transactionCode: string;
  status: PaymentStatus;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    amount: { type: Number, required: true, min: 0 },
    // Always 'MOCK' for now — no real gateway (VNPAY) wired up yet, see docs/business.md §8.
    paymentMethod: { type: String, required: true, default: 'MOCK' },
    transactionCode: { type: String, required: true, unique: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
    paymentDate: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ registrationId: 1 });

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
