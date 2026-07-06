import mongoose, { Schema, Document } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  otp: string;
  createdAt: Date;
}

const otpSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }
);

// Automatically delete document after 300 seconds (5 minutes)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });
otpSchema.index({ email: 1 });

export const OTP = mongoose.model<IOTP>('OTP', otpSchema);
