import mongoose, { Schema, Document } from 'mongoose';

export interface IStar extends Document {
  name: string;
  slug: string;
  imageUrl: string;
  verified: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const starSchema = new Schema<IStar>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    imageUrl: { type: String, required: true },
    verified: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

starSchema.index({ order: 1 });

export const Star = mongoose.model<IStar>('Star', starSchema);
