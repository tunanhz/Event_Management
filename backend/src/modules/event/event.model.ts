import mongoose, { Schema, Document } from 'mongoose';

export type EventCity = 'hcm' | 'hanoi' | 'dalat' | 'other';

export interface IContentBlock {
  type: 'heading' | 'paragraph' | 'list';
  text?: string;
  items?: string[];
}

export interface ISession {
  date: Date;
  time?: string;
  label?: string;
}

export interface IEvent extends Document {
  title: string;
  description: string;
  contentBlocks: IContentBlock[];
  date: Date;
  time?: string;
  sessions: ISession[];
  location: string;
  city: EventCity;
  maxAttendees: number;
  organizer: string;
  organizerLogoUrl?: string;
  organizerDescription?: string;
  organizerId?: mongoose.Types.ObjectId;
  category: string;
  categorySlug: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  imageUrl?: string;
  priceFrom: number;
  isFree: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contentBlockSchema = new Schema<IContentBlock>(
  {
    type: { type: String, enum: ['heading', 'paragraph', 'list'], required: true },
    text: { type: String },
    items: [{ type: String }],
  },
  { _id: false }
);

const sessionSchema = new Schema<ISession>(
  {
    date: { type: Date, required: true },
    time: { type: String },
    label: { type: String },
  },
  { _id: false }
);

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    contentBlocks: { type: [contentBlockSchema], default: [] },
    date: { type: Date, required: true },
    time: { type: String },
    sessions: { type: [sessionSchema], default: [] },
    location: { type: String, required: true },
    city: { type: String, enum: ['hcm', 'hanoi', 'dalat', 'other'], default: 'other' },
    maxAttendees: { type: Number, required: true, min: 1 },
    organizer: { type: String, required: true },
    organizerLogoUrl: { type: String },
    organizerDescription: { type: String },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User' },
    category: { type: String, required: true },
    categorySlug: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    imageUrl: { type: String },
    priceFrom: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ categorySlug: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ city: 1 });
eventSchema.index({ isFeatured: 1 });
eventSchema.index({ isTrending: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
