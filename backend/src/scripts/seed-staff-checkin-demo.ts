import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/user/user.model';
import { Event } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';
import { Registration } from '../modules/registration/registration.model';
import { StaffAssignment } from '../modules/staff/assignment.model';
import { CheckInLog } from '../modules/staff/checkin-log.model';

const STAFF_EMAIL = 'staff@eventbox.vn';
const STAFF_PASSWORD = 'Staff@123';
const PARTICIPANT_EMAIL = 'checkin.demo@eventbox.vn';
const PARTICIPANT_PASSWORD = 'Participant@123';
const EVENT_SLUG = 'staff-checkin-demo';
const TICKET_CODE = 'EVB-DEMO-CHECKIN';

async function ensureUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: 'STAFF' | 'PARTICIPANT';
}) {
  let user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) {
    user = new User({
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.password,
      role: input.role,
      accountStatus: 'ACTIVE',
    });
  } else {
    user.fullName = input.fullName;
    user.passwordHash = input.password;
    user.role = input.role;
    user.accountStatus = 'ACTIVE';
  }
  await user.save();
  return user;
}

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });

  const staff = await ensureUser({
    fullName: 'Staff Check-in Demo',
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
    role: 'STAFF',
  });
  const participant = await ensureUser({
    fullName: 'Khách Check-in Demo',
    email: PARTICIPANT_EMAIL,
    password: PARTICIPANT_PASSWORD,
    role: 'PARTICIPANT',
  });

  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  let event = await Event.findOne({ slug: EVENT_SLUG });
  if (!event) event = new Event();
  Object.assign(event, {
    title: 'Sự kiện Demo Quét mã Staff',
    description: 'Dữ liệu cục bộ dành riêng cho việc kiểm thử check-in.',
    contentBlocks: [],
    date: startDate,
    startDate,
    endDate,
    time: startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    sessions: [{ date: startDate, label: 'Ca demo' }],
    location: 'Cổng Demo EventBox',
    city: 'other',
    maxAttendees: 100,
    capacity: 100,
    organizer: 'EventBox Demo',
    category: 'Demo',
    categorySlug: 'demo',
    status: 'published',
    reviewStatus: 'PUBLISHED',
    slug: EVENT_SLUG,
    priceFrom: 0,
    isFree: true,
    isFeatured: false,
    isTrending: false,
    privacy: 'private',
    shows: [],
  });
  await event.save();

  let ticket = await Ticket.findOne({ eventId: event._id, ticketName: 'Vé Demo Check-in' });
  if (!ticket) {
    ticket = new Ticket({ eventId: event._id, ticketName: 'Vé Demo Check-in' });
  }
  Object.assign(ticket, {
    description: 'Vé dùng để kiểm thử quét mã.',
    price: 0,
    quantity: 100,
    soldQuantity: 1,
    minPerOrder: 1,
    maxPerOrder: 1,
    status: 'ACTIVE',
  });
  await ticket.save();

  await StaffAssignment.findOneAndUpdate(
    { eventId: event._id, staffId: staff._id },
    {
      $set: {
        gate: 'Không phân cổng',
        shift: `${startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        responsibility: 'Theo phân công',
        note: 'Quét mã và hỗ trợ check-in khách tham dự',
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Registration.findOneAndUpdate(
    { ticketCode: TICKET_CODE },
    {
      $set: {
        participantId: participant._id,
        eventId: event._id,
        ticketId: ticket._id,
        quantity: 1,
        unitPrice: 0,
        totalAmount: 0,
        registerDate: new Date(),
        status: 'PAID',
        ticketCode: TICKET_CODE,
        checkedIn: false,
      },
      $unset: { checkedInAt: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await CheckInLog.deleteMany({ eventId: event._id, ticketCode: TICKET_CODE });

  console.log('Staff check-in demo is ready');
  console.log(`Staff: ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
  console.log(`Participant: ${PARTICIPANT_EMAIL} / ${PARTICIPANT_PASSWORD}`);
  console.log(`Ticket code: ${TICKET_CODE}`);
  console.log(`Event id: ${event._id.toString()}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Could not prepare staff check-in demo:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
