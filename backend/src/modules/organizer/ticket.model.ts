import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  eventId: mongoose.Types.ObjectId;
  ticketName: string;
  description?: string;
  price: number;
  quantity: number;
  soldQuantity: number;
  saleStart?: Date;
  saleEnd?: Date;
  status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    ticketName: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    soldQuantity: { type: Number, default: 0, min: 0 },
    saleStart: { type: Date },
    saleEnd: { type: Date },
    status: {
      type: String,
      enum: ['ACTIVE', 'SOLD_OUT', 'HIDDEN'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({ eventId: 1 });
ticketSchema.index({ status: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
