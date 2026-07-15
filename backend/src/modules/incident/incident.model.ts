import mongoose, { Schema, Document } from 'mongoose';

export const INCIDENT_TYPES = [
  'fake-ticket',
  'duplicate-ticket',
  'device-error',
  'gate-issue',
  'other',
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED';

export interface IIncident extends Document {
  eventId: mongoose.Types.ObjectId;
  /** Staff member who filed the report. */
  reportedBy: mongoose.Types.ObjectId;
  type: IncidentType;
  /** Related ticket code, if any. */
  ticketCode?: string;
  description: string;
  status: IncidentStatus;
  /** Admin/manager who resolved the issue. */
  resolvedBy?: mongoose.Types.ObjectId;
  resolution?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: INCIDENT_TYPES,
      required: true,
    },
    ticketCode: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['PENDING', 'IN_REVIEW', 'RESOLVED'],
      default: 'PENDING',
    },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String, trim: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

incidentSchema.index({ eventId: 1, createdAt: -1 });
incidentSchema.index({ reportedBy: 1, createdAt: -1 });
incidentSchema.index({ status: 1 });

export const Incident = mongoose.model<IIncident>('Incident', incidentSchema);
