import mongoose, { Schema, Document } from 'mongoose';

/** One ticket type's contribution to a report, frozen at generation time. */
export interface IRevenueReportTicketRow {
  ticketId: mongoose.Types.ObjectId;
  ticketName: string;
  price: number;
  sold: number;
  revenue: number;
}

/**
 * RevenueReport — a generated revenue snapshot (ERD: RevenueReport: eventId,
 * generatedBy, reportName, reportType, fromDate, toDate, totalRevenue,
 * fileUrl, generatedAt). The organizer "Quản lý báo cáo" page generates and
 * lists these; totalRevenue is computed server-side from PAID registrations
 * so the stored number can't be forged by the client.
 *
 * `ticketBreakdown` is additive beyond the ERD: the per-ticket-type revenue
 * split, frozen at generation time (not recomputed later) so a report keeps
 * reading the same numbers even if later refunds change the live totals —
 * same "report is a historical snapshot" reasoning as `totalRevenue` itself.
 * Older reports created before this field existed simply have an empty array.
 *
 * `fileUrl` stays unused — Excel/PDF export is generated on demand per
 * request (GET .../export?format=) rather than stored on disk, so there is
 * no persisted file to link. Kept on the schema for ERD parity.
 */
export interface IRevenueReport extends Document {
  eventId: mongoose.Types.ObjectId;
  generatedBy: mongoose.Types.ObjectId;
  reportName: string;
  reportType: string;
  fromDate?: Date;
  toDate?: Date;
  totalRevenue: number;
  ticketBreakdown: IRevenueReportTicketRow[];
  fileUrl?: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketBreakdownSchema = new Schema<IRevenueReportTicketRow>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true },
    ticketName: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    sold: { type: Number, required: true, min: 0 },
    revenue: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const revenueReportSchema = new Schema<IRevenueReport>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportName: { type: String, required: true, trim: true, maxlength: 200 },
    reportType: { type: String, default: 'EVENT_REVENUE', trim: true, maxlength: 50 },
    fromDate: { type: Date },
    toDate: { type: Date },
    totalRevenue: { type: Number, required: true, min: 0 },
    ticketBreakdown: { type: [ticketBreakdownSchema], default: [] },
    fileUrl: { type: String, trim: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

revenueReportSchema.index({ generatedBy: 1, generatedAt: -1 });
revenueReportSchema.index({ eventId: 1 });

export const RevenueReport = mongoose.model<IRevenueReport>(
  'RevenueReport',
  revenueReportSchema
);
