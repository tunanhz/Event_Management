import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  location: string;
  maxAttendees: number;
  organizer: string;
  category: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    location: { type: String, required: true },
    maxAttendees: { type: Number, required: true, min: 1 },
    organizer: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
    },
    imageUrl: { type: String },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ organizer: 1 });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
