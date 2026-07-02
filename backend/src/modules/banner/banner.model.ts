import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaLabel?: string;
  linkUrl?: string;
  eventId?: mongoose.Types.ObjectId;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String },
    imageUrl: { type: String, required: true },
    ctaLabel: { type: String },
    linkUrl: { type: String },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

bannerSchema.index({ isActive: 1, order: 1 });

export const Banner = mongoose.model<IBanner>('Banner', bannerSchema);
