import mongoose, { Schema, Document } from 'mongoose';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IncidentCategory =
  | 'security'
  | 'crowd_control'
  | 'equipment'
  | 'medical'
  | 'ticket_dispute'
  | 'other';

export interface IIncidentReport extends Document {
  eventId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  /** Vị trí cụ thể: "Cổng A", "Khu VIP", "Sân khấu chính" */
  location: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  /** URL ảnh / file đính kèm */
  attachments: string[];
  status: IncidentStatus;
  /** Ghi chú khi giải quyết xong (Admin điền) */
  resolvedNote?: string;
  resolvedAt?: Date;
  resolvedById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncidentReport>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    category: {
      type: String,
      enum: ['security', 'crowd_control', 'equipment', 'medical', 'ticket_dispute', 'other'],
      default: 'other',
    },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    resolvedNote: { type: String, trim: true },
    resolvedAt: { type: Date },
    resolvedById: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

incidentSchema.index({ eventId: 1, createdAt: -1 });
incidentSchema.index({ staffId: 1, createdAt: -1 });
incidentSchema.index({ severity: 1, status: 1 });

export const IncidentReport = mongoose.model<IIncidentReport>('IncidentReport', incidentSchema);
