import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  eventId: mongoose.Types.ObjectId;
  /** Showing this tier belongs to (embedded _id in Event.shows). Absent on
   *  legacy single-show events created via the flat payload. */
  showId?: mongoose.Types.ObjectId;
  ticketName: string;
  description?: string;
  price: number;
  quantity: number;
  soldQuantity: number;
  /** Min / max tickets a single order may buy (wizard step 2). */
  minPerOrder: number;
  maxPerOrder: number;
  /** Ticket artwork URL. */
  image?: string;
  saleStart?: Date;
  saleEnd?: Date;
  status: 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    showId: { type: Schema.Types.ObjectId },
    ticketName: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    soldQuantity: { type: Number, default: 0, min: 0 },
    minPerOrder: { type: Number, default: 1, min: 1 },
    maxPerOrder: { type: Number, default: 10, min: 1 },
    image: { type: String },
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
ticketSchema.index({ showId: 1 });
ticketSchema.index({ status: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
