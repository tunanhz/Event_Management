import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================
USER
========================= */
const UserSchema = new Schema(
{
  fullName: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  avatar: String,
  role: {
    type: String,
    enum: ["Admin", "Organizer", "Participant", "Staff"]
  },
  status: String
},
{ timestamps: true }
);

/* =========================
CATEGORY
========================= */
const CategorySchema = new Schema(
{
  name: String,
  description: String,
  status: String
},
{ timestamps: true }
);

/* =========================
EVENT
========================= */
const EventSchema = new Schema(
{
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: "Category"
  },

  creatorId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  approvedById: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  title: String,
  description: String,
  location: String,
  banner: String,

  startDate: Date,
  endDate: Date,

  capacity: Number,

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Completed", "Cancelled"]
  }
},
{ timestamps: true }
);

/* =========================
TICKET
========================= */
const TicketSchema = new Schema(
{
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  ticketName: String,
  description: String,

  price: Number,
  quantity: Number,
  soldQuantity: {
    type: Number,
    default: 0
  },

  saleStart: Date,
  saleEnd: Date,

  status: String
},
{ timestamps: true }
);

/* =========================
REGISTRATION
========================= */
const RegistrationSchema = new Schema(
{
  participantId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  ticketId: {
    type: Schema.Types.ObjectId,
    ref: "Ticket"
  },

  quantity: Number,

  registerDate: Date,

  status: String
},
{ timestamps: true }
);

/* =========================
PAYMENT
========================= */
const PaymentSchema = new Schema(
{
  registrationId: {
    type: Schema.Types.ObjectId,
    ref: "Registration"
  },

  amount: Number,

  paymentMethod: String,

  transactionCode: String,

  status: String,

  paymentDate: Date
},
{ timestamps: true }
);

/* =========================
CHECK IN
========================= */
const CheckInSchema = new Schema(
{
  registrationId: {
    type: Schema.Types.ObjectId,
    ref: "Registration"
  },

  checkInTime: Date,

  status: String,

  note: String
},
{ timestamps: true }
);

/* =========================
STAFF ASSIGNMENT
========================= */
const StaffAssignmentSchema = new Schema(
{
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  staffId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  roleInEvent: String,

  status: String,

  assignedAt: Date
},
{ timestamps: true }
);

/* =========================
CONTRACT
========================= */
const ContractSchema = new Schema(
{
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  managedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  documentName: String,

  documentType: String,

  documentUrl: String,

  status: String,
  uploadedAt: Date,

  note: String
},
{ timestamps: true }
);

/* =========================
WITHDRAWAL
========================= */
const WithdrawalSchema = new Schema(
{
  organizerId: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  kind: {
    type: String,
    enum: ["payout", "refund"],
    default: "payout"
  },

  beneficiary: String,
  bankInfo: String,

  amount: Number,

  requestDate: Date,

  approvedAt: Date,

  status: String,

  rejectionReason: String
},
{ timestamps: true }
);

/* =========================
REVENUE REPORT
========================= */
const RevenueReportSchema = new Schema(
{
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  reportName: String,

  reportType: String,

  fromDate: Date,

  toDate: Date,

  totalRevenue: Number,

  fileUrl: String,

  generatedAt: Date
},
{ timestamps: true }
);

/* =========================
ISSUE
========================= */
const IssueSchema = new Schema(
{
  eventId: {
    type: Schema.Types.ObjectId,
    ref: "Event"
  },

  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },

  title: String,

  description: String,

  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"]
  },

  status: String,

  resolution: String,

  createdAt: Date,

  resolvedAt: Date
},
{ timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
export const Ticket = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
export const Registration = mongoose.models.Registration || mongoose.model("Registration", RegistrationSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const CheckIn = mongoose.models.CheckIn || mongoose.model("CheckIn", CheckInSchema);
export const StaffAssignment = mongoose.models.StaffAssignment || mongoose.model("StaffAssignment", StaffAssignmentSchema);
export const Contract = mongoose.models.Contract || mongoose.model("Contract", ContractSchema);
export const Withdrawal = mongoose.models.Withdrawal || mongoose.model("Withdrawal", WithdrawalSchema);
export const RevenueReport = mongoose.models.RevenueReport || mongoose.model("RevenueReport", RevenueReportSchema);
export const Issue = mongoose.models.Issue || mongoose.model("Issue", IssueSchema);
