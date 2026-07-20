import mongoose, { Schema, Document } from 'mongoose';
import {
  IShow,
  IVenue,
  IPermitDocument,
  IEventContract,
  IPaymentInfo,
  showSchema,
  venueSchema,
  permitDocumentSchema,
  eventContractSchema,
  paymentInfoSchema,
} from './event-wizard-fields.schema';

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
  views: number;
  createdAt: Date;
  updatedAt: Date;

  // ── ERD-aligned fields (EM-23 Event Creation / organizer module) ──
  // Additive only, kept alongside the fields above so existing homepage/listing/
  // detail queries keep working unchanged. Written in parallel with their legacy
  // counterpart (date/maxAttendees/imageUrl/organizer/category/categorySlug) by
  // the organizer module at creation time — see modules/organizer/organizer.service.ts.
  categoryId?: mongoose.Types.ObjectId;
  creatorId?: mongoose.Types.ObjectId;
  approvedById?: mongoose.Types.ObjectId;
  banner?: string;
  startDate?: Date;
  endDate?: Date;
  capacity?: number;
  // Organizer approval workflow state (separate from the legacy public-listing
  // `status` field above, which controls homepage visibility).
  reviewStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED_WAITING_DEPOSIT' | 'PUBLISHED' | 'REJECTED';
  // Set by admin moderation: reason shown to the organizer on REJECTED,
  // timestamp of the approve/reject decision.
  rejectionReason?: string;
  reviewedAt?: Date;

  // ── Service cost & deposit fields (admin quotation workflow) ──
  serviceCost: number;
  depositAmount: number;
  depositStatus: 'UNPAID' | 'PAID';
  additionalCost: number;
  finalPaymentAmount: number;
  finalPaymentStatus: 'UNPAID' | 'PAID';

  // ── Full 6-step wizard fields (organizer create-event form) ──
  posterImage?: string;
  locationType?: 'offline' | 'online';
  venue?: IVenue;
  /** Showings; startDate/endDate above are derived as min/max of these. */
  shows: IShow[];
  /** Custom public URL path segment (step 3). Unique when present. */
  slug?: string;
  privacy: 'public' | 'private';
  confirmationMessage?: string;
  /** Platform support services requested (step 4), e.g. "audio-lighting". */
  logisticsServices: string[];
  permitDocuments: IPermitDocument[];
  contract?: IEventContract;
  paymentInfo?: IPaymentInfo;
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
    views: { type: Number, default: 0 },

    // ── ERD-aligned fields (EM-23 Event Creation / organizer module) ──
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    banner: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    capacity: { type: Number, min: 1 },
    reviewStatus: {
      type: String,
      enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED_WAITING_DEPOSIT', 'PUBLISHED', 'REJECTED'],
      default: 'DRAFT',
    },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: { type: Date },

    // ── Service cost & deposit fields (admin quotation workflow) ──
    serviceCost: { type: Number, default: 0, min: 0 },
    depositAmount: { type: Number, default: 0, min: 0 },
    depositStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
    additionalCost: { type: Number, default: 0, min: 0 },
    finalPaymentAmount: { type: Number, default: 0, min: 0 },
    finalPaymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },

    // ── Full 6-step wizard fields (organizer create-event form) ──
    posterImage: { type: String },
    locationType: { type: String, enum: ['offline', 'online'] },
    venue: { type: venueSchema },
    shows: { type: [showSchema], default: [] },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 80,
      match: /^[a-z0-9-]+$/,
    },
    privacy: { type: String, enum: ['public', 'private'], default: 'public' },
    confirmationMessage: { type: String, maxlength: 500 },
    logisticsServices: { type: [String], default: [] },
    permitDocuments: { type: [permitDocumentSchema], default: [] },
    contract: { type: eventContractSchema },
    paymentInfo: { type: paymentInfoSchema },
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
eventSchema.index({ views: -1 });
eventSchema.index({ categoryId: 1 });
eventSchema.index({ creatorId: 1 });
eventSchema.index({ reviewStatus: 1 });
// sparse: legacy events without a custom slug are exempt from uniqueness
eventSchema.index({ slug: 1 }, { unique: true, sparse: true });

export const Event = mongoose.model<IEvent>('Event', eventSchema);
