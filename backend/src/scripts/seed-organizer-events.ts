/**
 * Seed sample organizer events across the whole review lifecycle so the wired
 * screens have realistic data:
 *   - Organizer "Sự kiện của tôi": drafts, pending, published, rejected
 *   - Admin "Kiểm duyệt sự kiện": the PENDING_REVIEW queue + decided events
 *
 * All events are owned by a dedicated demo ORGANIZER account so re-running is
 * safe (it wipes only this account's previously-seeded events + their tickets).
 *
 * Usage: npm run seed:events   (run `npm run seed:homepage` first for categories)
 * Login to view:  organizer@eventbox.vn / Organizer@123   (Ban tổ chức)
 *                 admin@eventbox.vn / Admin@123456          (Admin — npm run seed:admin)
 */
import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/user/user.model';
import { Category } from '../modules/category/category.model';
import { Event, IEvent } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';

const ORGANIZER = {
  fullName: 'EventBox Demo Organizer',
  email: 'organizer@eventbox.vn',
  password: 'Organizer@123',
  phone: '0901234567',
};

const day = 24 * 60 * 60 * 1000;
const future = (days: number, hour = 19) =>
  new Date(Date.now() + days * day + hour * 60 * 60 * 1000);
const past = (days: number) => new Date(Date.now() - days * day);

type ReviewStatus = IEvent['reviewStatus'];

interface SeedEvent {
  title: string;
  description: string;
  organizerName: string;
  categorySlug: string;
  location: string;
  banner: string;
  reviewStatus: ReviewStatus;
  startDate: Date;
  endDate: Date;
  capacity: number;
  rejectionReason?: string;
  tickets: { ticketName: string; price: number; quantity: number }[];
}

const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=800&h=450&fit=crop`;

const SEED_EVENTS: SeedEvent[] = [
  {
    title: 'Đêm nhạc Acoustic Trịnh Công Sơn',
    description: '<p>Đêm nhạc acoustic tưởng nhớ nhạc sĩ Trịnh Công Sơn với các ca sĩ trẻ.</p>',
    organizerName: 'Sài Gòn Music Group',
    categorySlug: 'nhac-song',
    location: 'Nhà hát Hòa Bình, TP. Hồ Chí Minh',
    banner: img('1470229722913-7c0e2dbbafd3'),
    reviewStatus: 'PENDING_REVIEW',
    startDate: future(30), endDate: future(30, 22), capacity: 1200,
    tickets: [
      { ticketName: 'Standard', price: 350000, quantity: 800 },
      { ticketName: 'VIP', price: 750000, quantity: 300 },
    ],
  },
  {
    title: 'Hội thảo AI & Tương lai việc làm',
    description: '<p>Hội thảo nửa ngày về tác động của AI tới thị trường lao động.</p>',
    organizerName: 'TechTalk Vietnam',
    categorySlug: 'hoi-thao',
    location: 'Đại học Bách Khoa, Hà Nội',
    banner: img('1540575467063-178a50c2df87'),
    reviewStatus: 'PENDING_REVIEW',
    startDate: future(40, 8), endDate: future(40, 12), capacity: 500,
    tickets: [
      { ticketName: 'Vé miễn phí (sinh viên)', price: 0, quantity: 300 },
      { ticketName: 'Vé thường', price: 150000, quantity: 200 },
    ],
  },
  {
    title: 'Giải chạy vì trẻ em vùng cao',
    description: '<p>Giải chạy gây quỹ từ thiện cự ly 5km/10km/21km quanh Hồ Tây.</p>',
    organizerName: 'Run For Life',
    categorySlug: 'the-thao',
    location: 'Hồ Tây, Hà Nội',
    banner: img('1546519638-68e109498ffc'),
    reviewStatus: 'PENDING_REVIEW',
    startDate: future(55, 5), endDate: future(55, 11), capacity: 3000,
    tickets: [
      { ticketName: '5km Fun Run', price: 250000, quantity: 1500 },
      { ticketName: '10km', price: 400000, quantity: 1000 },
    ],
  },
  {
    title: 'Liveshow Kỷ niệm 10 năm',
    description: '<p>Đêm nhạc kỷ niệm 10 năm thành lập với dàn khách mời đặc biệt.</p>',
    organizerName: 'EventBox Live',
    categorySlug: 'nhac-song',
    location: 'Sân vận động Phú Thọ, TP. Hồ Chí Minh',
    banner: img('1493225457124-a3eb161ffa5f'),
    reviewStatus: 'PUBLISHED',
    startDate: future(20), endDate: future(20, 23), capacity: 8000,
    tickets: [{ ticketName: 'Thường', price: 400000, quantity: 7000 }],
  },
  {
    title: 'Gala Tổng kết Cuối năm 2025',
    description: '<p>Đêm gala tổng kết và vinh danh cuối năm.</p>',
    organizerName: 'EventBox Live',
    categorySlug: 'san-khau',
    location: 'InterContinental Saigon, Quận 1',
    banner: img('1511578314322-379afb476865'),
    reviewStatus: 'PUBLISHED',
    startDate: past(30), endDate: past(30), capacity: 800,
    tickets: [{ ticketName: 'Vé Gala', price: 535000, quantity: 800 }],
  },
  {
    title: 'Đêm hài kịch tổng hợp',
    description: '<p>Đêm diễn hài kịch tổng hợp nhiều tiết mục.</p>',
    organizerName: 'Night Comedy Co.',
    categorySlug: 'san-khau',
    location: 'Nhà văn hóa Thanh Niên, Quận 1',
    banner: img('1516280440614-37939bbacd81'),
    reviewStatus: 'REJECTED',
    startDate: future(35, 20), endDate: future(35, 22), capacity: 350,
    rejectionReason:
      'Thiếu giấy phép biểu diễn nghệ thuật do Sở VH-TT cấp; vui lòng bổ sung và gửi lại.',
    tickets: [{ ticketName: 'Vé thường', price: 200000, quantity: 350 }],
  },
  {
    title: 'Workshop Nhiếp ảnh Đường phố (nháp)',
    description: '<p>Workshop nhiếp ảnh đường phố cho người mới bắt đầu.</p>',
    organizerName: 'Urban Lens',
    categorySlug: 'tham-quan',
    location: 'Studio A, Quận 3, TP. Hồ Chí Minh',
    banner: img('1516035069371-29a1b244cc32'),
    reviewStatus: 'DRAFT',
    startDate: future(60, 14), endDate: future(60, 17), capacity: 60,
    tickets: [{ ticketName: 'Vé workshop', price: 200000, quantity: 60 }],
  },
];

const cityFor = (loc: string): IEvent['city'] =>
  /hà nội|ha noi|hồ tây/i.test(loc) ? 'hanoi' : /hồ chí minh|hcm|quận|sài gòn/i.test(loc) ? 'hcm' : 'other';

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);

  // 1. Ensure the demo organizer account (password hashed by the model hook).
  let organizer = await User.findOne({ email: ORGANIZER.email }).select('+passwordHash');
  if (!organizer) {
    organizer = new User({
      fullName: ORGANIZER.fullName,
      email: ORGANIZER.email,
      passwordHash: ORGANIZER.password,
      phone: ORGANIZER.phone,
      role: 'ORGANIZER',
      accountStatus: 'ACTIVE',
    });
    await organizer.save();
    console.log('✅ Đã tạo tài khoản ORGANIZER demo:', ORGANIZER.email);
  } else {
    organizer.role = 'ORGANIZER';
    organizer.accountStatus = 'ACTIVE';
    organizer.passwordHash = ORGANIZER.password;
    await organizer.save();
    console.log('♻️  Cập nhật tài khoản ORGANIZER demo:', ORGANIZER.email);
  }
  const organizerId = organizer._id as mongoose.Types.ObjectId;

  // 2. Categories must exist (seed:homepage). Map slug → category doc.
  const categories = await Category.find().lean();
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));
  if (catBySlug.size === 0) {
    throw new Error('Chưa có Category nào — chạy `npm run seed:homepage` trước.');
  }

  // 3. Idempotent reset: remove this organizer's previously-seeded events + tickets.
  const titles = SEED_EVENTS.map((e) => e.title);
  const old = await Event.find({ creatorId: organizerId, title: { $in: titles } }).select('_id');
  const oldIds = old.map((e) => e._id);
  if (oldIds.length) {
    await Ticket.deleteMany({ eventId: { $in: oldIds } });
    await Event.deleteMany({ _id: { $in: oldIds } });
    console.log(`♻️  Đã xoá ${oldIds.length} sự kiện seed cũ + vé của chúng.`);
  }

  // 4. Insert events + tickets.
  let count = 0;
  for (const s of SEED_EVENTS) {
    const cat = catBySlug.get(s.categorySlug) ?? categories[0];
    const isPublished = s.reviewStatus === 'PUBLISHED';
    const event = await Event.create({
      title: s.title,
      description: s.description,
      location: s.location,
      banner: s.banner,
      imageUrl: s.banner,
      city: cityFor(s.location),
      categoryId: cat._id,
      category: cat.name,
      categorySlug: cat.slug,
      creatorId: organizerId,
      organizer: s.organizerName,
      organizerId,
      startDate: s.startDate,
      endDate: s.endDate,
      date: s.startDate,
      capacity: s.capacity,
      maxAttendees: s.capacity,
      reviewStatus: s.reviewStatus,
      rejectionReason: s.rejectionReason,
      reviewedAt: s.reviewStatus === 'PENDING_REVIEW' || s.reviewStatus === 'DRAFT' ? undefined : new Date(),
      approvedById: isPublished ? organizerId : undefined, // placeholder; real approvals set the admin id
      // Legacy public-listing visibility: only PUBLISHED events go public.
      status: isPublished ? 'published' : 'draft',
      priceFrom: Math.min(...s.tickets.map((t) => t.price)),
      isFree: s.tickets.every((t) => t.price === 0),
    });
    for (const t of s.tickets) {
      await Ticket.create({
        eventId: event._id,
        ticketName: t.ticketName,
        price: t.price,
        quantity: t.quantity,
        saleStart: past(1),
        saleEnd: s.startDate,
        status: 'ACTIVE',
      });
    }
    count += 1;
    console.log(`  • ${s.reviewStatus.padEnd(15)} ${s.title}`);
  }
  console.log(`\n✅ Đã seed ${count} sự kiện (đủ trạng thái) cho organizer demo.`);
  console.log('   Đăng nhập organizer: organizer@eventbox.vn / Organizer@123');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed organizer events thất bại:', err?.message || err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
