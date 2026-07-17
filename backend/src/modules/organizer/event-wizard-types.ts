/**
 * Input DTOs for the organizer create-event wizard (full 6-step payload).
 * The create endpoint accepts either:
 *  - canonical shape: `shows[]`, each show carrying its own ticket tiers, or
 *  - legacy flat shape: top-level `startDate/endDate` + `tickets[]` (kept so
 *    pre-wizard clients and QA suites keep working unchanged).
 */

export interface VenueInput {
  name?: string;
  province?: string;
  ward?: string;
  street?: string;
}

/** One sellable ticket tier (FE `TicketType`; `isFree` maps to price=0 FE-side). */
export interface CreateTicketInput {
  ticketName: string;
  description?: string;
  price: number;
  quantity: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  image?: string;
  saleStart?: string | Date;
  saleEnd?: string | Date;
  status?: 'ACTIVE' | 'HIDDEN';
}

/** One showing with its own time range and ticket tiers (FE `EventShow`). */
export interface ShowInput {
  /** Present on update: matches an existing embedded show `_id`. */
  _id?: string;
  /** Organizer-facing label, e.g. "Đêm khai mạc". Optional. */
  title?: string;
  startTime: string | Date;
  endTime: string | Date;
  tickets?: CreateTicketInput[];
}

export interface PermitDocumentInput {
  name: string;
  url: string;
  sizeKb?: number;
}

export interface ContractInput {
  repName?: string;
  agreed?: boolean;
  /** PNG returned by POST /api/uploads/signatures (hand-drawn signature pad). */
  signatureUrl?: string;
}

export interface PaymentInfoInput {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface CreateEventInput {
  // ── Step 1: general info ──
  title: string;
  description: string;
  categoryId: string;
  capacity: number;
  banner: string;
  posterImage?: string;
  locationType?: 'offline' | 'online';
  venue?: VenueInput;
  /** Pre-composed display location; derived from `venue` when absent. */
  location?: string;
  orgName?: string;
  orgLogo?: string;
  orgInfo?: string;
  // ── Step 2: shows & tickets (canonical) or legacy flat fields ──
  shows?: ShowInput[];
  startDate?: string | Date;
  endDate?: string | Date;
  tickets?: CreateTicketInput[];
  // ── Step 3: settings ──
  slug?: string;
  privacy?: 'public' | 'private';
  confirmationMessage?: string;
  // ── Step 4: logistics & legal permits ──
  logisticsServices?: string[];
  permitDocuments?: PermitDocumentInput[];
  // ── Step 5: contract ──
  contract?: ContractInput;
  // ── Step 6: payout info ──
  paymentInfo?: PaymentInfoInput;
}

export type UpdateEventInput = Partial<CreateEventInput>;
export type UpdateTicketInput = Partial<CreateTicketInput> & { showId?: string };

/** One row of a full ticket-type configuration submit (EM-128).
 *  `_id` present ⇒ update an existing ticket type; absent ⇒ create a new one.
 *  Any existing ticket type not referenced by `_id` in the submitted set is removed.
 *  `showId` attaches the tier to a specific showing (required per-row only when
 *  the event actually has shows). */
export type ConfigureTicketInput = CreateTicketInput & { _id?: string; showId?: string };
