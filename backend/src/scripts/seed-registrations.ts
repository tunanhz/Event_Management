/**
 * Seed a demo PARTICIPANT + sample paid/cancelled registrations so the
 * "Vé của tôi" (/ve-cua-toi) page has real data to render.
 *
 * Usage: npm run seed:registrations   (run seed:homepage first for events)
 * Login to view:  participant@eventbox.vn / Participant@123
 * Idempotent: wipes this participant's previous registrations + payments first.
 */
import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/user/user.model';
import { Event } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';
import { Registration } from '../modules/registration/registration.model';
import { Payment } from '../modules/registration/payment.model';

const PARTICIPANT = {
  fullName: 'EventBox Demo Participant',
  email: 'participant@eventbox.vn',
  password: 'Participant@123',
  phone: '0912345678',
};

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);

  // 1. Ensure the demo participant (password hashed by the model pre-save hook).
  let user = await User.findOne({ email: PARTICIPANT.email }).select('+passwordHash');
  if (!user) {
    user = new User({
      fullName: PARTICIPANT.fullName,
      email: PARTICIPANT.email,
      passwordHash: PARTICIPANT.password,
      phone: PARTICIPANT.phone,
      role: 'PARTICIPANT',
      accountStatus: 'ACTIVE',
    });
    await user.save();
    console.log('✅ Đã tạo tài khoản PARTICIPANT demo:', PARTICIPANT.email);
  } else {
    user.role = 'PARTICIPANT';
    user.accountStatus = 'ACTIVE';
    user.passwordHash = PARTICIPANT.password;
    await user.save();
    console.log('♻️  Cập nhật tài khoản PARTICIPANT demo:', PARTICIPANT.email);
  }
  const participantId = user._id as mongoose.Types.ObjectId;

  // 2. Idempotent reset — drop this participant's registrations + their payments.
  const prev = await Registration.find({ participantId }).select('_id');
  const prevIds = prev.map((r) => r._id);
  if (prevIds.length) {
    await Payment.deleteMany({ registrationId: { $in: prevIds } });
    await Registration.deleteMany({ _id: { $in: prevIds } });
    console.log(`♻️  Đã xoá ${prevIds.length} đăng ký cũ + payment.`);
  }

  // 3. Pick a few published events (a mix of future & past) with a ticket tier.
  const all = await Event.find({ status: 'published' }).sort({ date: 1 }).limit(60).lean();
  if (all.length === 0) {
    throw new Error('Chưa có sự kiện published — chạy `npm run seed:homepage` trước.');
  }

  const now = Date.now();
  // Mix future + past so the "Sắp tới" / "Đã sử dụng" tabs both have data.
  const future = all.filter((e) => new Date(e.date).getTime() >= now);
  const pastEv = all.filter((e) => new Date(e.date).getTime() < now);
  const events = [...future.slice(0, 3), ...pastEv.slice(0, 2)];

  let created = 0;
  // One CANCELLED among the PAID ones (last).
  for (const [i, event] of events.entries()) {
    const ticket = await Ticket.findOne({ eventId: event._id }).lean();
    if (!ticket) continue;

    const quantity = (i % 2) + 1; // 1 or 2
    const isCancelled = i === events.length - 1; // last one cancelled
    const status = isCancelled ? 'CANCELLED' : 'PAID';
    const eventDate = new Date(event.date).getTime();

    const reg = await Registration.create({
      participantId,
      eventId: event._id,
      ticketId: ticket._id,
      quantity,
      unitPrice: ticket.price,
      totalAmount: ticket.price * quantity,
      registerDate: new Date(now - (i + 1) * 24 * 60 * 60 * 1000),
      status,
    });

    if (status === 'PAID') {
      // Sold stock reflects the paid registration.
      await Ticket.updateOne({ _id: ticket._id }, { $inc: { soldQuantity: quantity } });
      await Payment.create({
        registrationId: reg._id,
        amount: reg.totalAmount,
        paymentMethod: 'MOCK',
        transactionCode: `MOCK-SEED-${reg._id}`,
        status: 'PAID',
        paymentDate: new Date(now - (i + 1) * 24 * 60 * 60 * 1000),
      });
    }

    const bucket = status === 'CANCELLED' ? 'CANCELLED' : eventDate < now ? 'PAID (đã diễn ra)' : 'PAID (sắp tới)';
    console.log(`  • ${bucket.padEnd(18)} ${event.title} × ${quantity}`);
    created += 1;
  }

  console.log(`\n✅ Đã seed ${created} đăng ký cho participant demo.`);
  console.log('   Đăng nhập participant: participant@eventbox.vn / Participant@123');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed registrations thất bại:', err?.message || err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
