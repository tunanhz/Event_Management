import mongoose, { Schema } from 'mongoose';

/**
 * Sub-schemas for the organizer "Create Event" wizard fields embedded in Event.
 * Kept separate from event.model.ts so the base model stays readable.
 * All additive — legacy events simply have these fields empty/absent.
 */

/** One showing/occurrence of the event with its own time range (wizard step 2).
 *  Ticket types reference a show via Ticket.showId (embedded _id below). */
export interface IShow {
  /** Auto-generated on save; optional so service code can build plain rows. */
  _id?: mongoose.Types.ObjectId;
  /** Organizer-facing label, e.g. "Đêm khai mạc", "Suất chiều". Optional —
   *  falls back to an auto-numbered "Suất N" wherever it's displayed. */
  title?: string;
  startTime: Date;
  endTime: Date;
}

/** Structured venue address (wizard step 1). `location` on Event keeps the
 *  composed display string for legacy listing/search. */
export interface IVenue {
  name?: string;
  province?: string;
  ward?: string;
  street?: string;
}

/** Uploaded legal permit / license document metadata (wizard step 4). */
export interface IPermitDocument {
  name: string;
  url: string;
  sizeKb?: number;
  /** Defaulted by the schema at persist time. */
  uploadedAt?: Date;
}

/** Service contract acceptance (wizard step 5). The representative signs on a
 *  canvas; the PNG is stored via /api/uploads/signatures and referenced here.
 *  `signatureHash` = SHA-256 over (repName|signatureUrl|signedAt) — an
 *  integrity stamp so the stored acceptance can't be silently altered. */
export interface IEventContract {
  repName?: string;
  agreed: boolean;
  agreedAt?: Date;
  signatureUrl?: string;
  signatureHash?: string;
  signedAt?: Date;
}

/** Organizer payout account for this event (wizard step 6). */
export interface IPaymentInfo {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export const showSchema = new Schema<IShow>({
  title: { type: String, trim: true, maxlength: 100 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
});

export const venueSchema = new Schema<IVenue>(
  {
    name: { type: String, trim: true, maxlength: 80 },
    province: { type: String, trim: true, maxlength: 80 },
    ward: { type: String, trim: true, maxlength: 80 },
    street: { type: String, trim: true, maxlength: 80 },
  },
  { _id: false }
);

export const permitDocumentSchema = new Schema<IPermitDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true, trim: true },
    sizeKb: { type: Number, min: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const eventContractSchema = new Schema<IEventContract>(
  {
    repName: { type: String, trim: true, maxlength: 80 },
    agreed: { type: Boolean, default: false },
    agreedAt: { type: Date },
    signatureUrl: { type: String, trim: true },
    signatureHash: { type: String, trim: true, maxlength: 64 },
    signedAt: { type: Date },
  },
  { _id: false }
);

export const paymentInfoSchema = new Schema<IPaymentInfo>(
  {
    bankName: { type: String, trim: true, maxlength: 100 },
    accountNumber: { type: String, trim: true, maxlength: 30 },
    accountHolder: { type: String, trim: true, maxlength: 100 },
  },
  { _id: false }
);
