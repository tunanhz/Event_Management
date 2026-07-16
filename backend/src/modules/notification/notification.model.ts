import mongoose, { Schema, Document } from 'mongoose';

/**
 * Notification — an in-app message to one user (ERD: Notification: userId,
 * title, message, type, isRead, createdAt). First writer: the registration
 * module, which creates one when a ticket purchase is confirmed (see
 * registration.service.ts). No public list/mark-read API yet — that's a
 * separate feature; this module currently only exists to be written to.
 *
 * All 5 ERD fields are kept — none can be dropped without losing something a
 * notification list actually needs: `title` for a compact row, `message` for
 * the detail, `type` to distinguish future kinds (approval, payout, …) from
 * this first one, `isRead` for the unread badge.
 */
export type NotificationType = 'REGISTRATION_CONFIRMED';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    // Not a hard Mongoose enum: future producers (admin approval/reject,
    // payout, issue resolution — per the ERD's other notification kinds)
    // add their own type value without a schema migration, same pattern as
    // RevenueReport.reportType.
    type: { type: String, required: true, trim: true, maxlength: 50 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
