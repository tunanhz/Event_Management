/**
 * Seed reference data + sample published events for the homepage
 * (categories, featured stars, hero banners, a handful of events covering
 * the featured / trending / upcoming collections).
 *
 * Usage: npm run seed:homepage
 * Idempotent: upserts by slug/title so re-running is safe.
 */
import mongoose from 'mongoose';
import { config } from '../config';
import { Category } from '../modules/category/category.model';
import { Star } from '../modules/star/star.model';
import { Banner } from '../modules/banner/banner.model';
import { Event } from '../modules/event/event.model';

const categories = [
  { name: 'Nhạc sống', slug: 'nhac-song', icon: '🎵', order: 1 },
  { name: 'Sân khấu & Nghệ thuật', slug: 'san-khau', icon: '🎭', order: 2 },
  { name: 'Thể Thao', slug: 'the-thao', icon: '⚽', order: 3 },
  { name: 'Hội thảo & Workshop', slug: 'hoi-thao', icon: '🎤', order: 4 },
  { name: 'Tham quan & Trải nghiệm', slug: 'tham-quan', icon: '✈️', order: 5 },
  { name: 'Khác', slug: 'khac', icon: '🎯', order: 6 },
];

const stars = [
  { name: 'SS Label', slug: 'ss-label', verified: true, imageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&h=240&fit=crop', order: 1 },
  { name: 'Phùng Khánh Linh', slug: 'phung-khanh-linh', verified: true, imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&fit=crop', order: 2 },
  { name: 'Jun Phạm', slug: 'jun-pham', verified: true, imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop', order: 3 },
  { name: 'Hà Anh Tuấn', slug: 'ha-anh-tuan', verified: true, imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&h=240&fit=crop', order: 4 },
  { name: 'Mỹ Tâm', slug: 'my-tam', verified: true, imageUrl: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=240&h=240&fit=crop', order: 5 },
];

const banners = [
  {
    title: 'Đại Nhạc Hội Quốc Tế 2026',
    subtitle: 'Trải nghiệm âm nhạc đỉnh cao cùng các nghệ sĩ hàng đầu',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1400&h=500&fit=crop',
    ctaLabel: 'Mua vé ngay',
    order: 1,
    isActive: true,
  },
  {
    title: 'Festival Mùa Hè Đà Nẵng',
    subtitle: 'Lễ hội pháo hoa, âm nhạc và ẩm thực đặc sắc',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&h=500&fit=crop',
    ctaLabel: 'Khám phá ngay',
    order: 2,
    isActive: true,
  },
];

const events = [
  {
    title: 'Đại Nhạc Hội Âm Nhạc Quốc Tế 2026',
    description: 'Đại nhạc hội quy tụ các nghệ sĩ quốc tế hàng đầu.',
    date: new Date('2026-06-28T18:00:00+07:00'),
    time: '18:00',
    location: 'Nhà hát Hòa Bình, TP.HCM',
    city: 'hcm' as const,
    maxAttendees: 2000,
    organizer: 'EventBox Live',
    category: 'Nhạc sống',
    categorySlug: 'nhac-song',
    status: 'published' as const,
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
    priceFrom: 500000,
    isFree: false,
    isFeatured: true,
    isTrending: false,
  },
  {
    title: 'Festival Sáng Tạo & Công Nghệ Việt Nam',
    description: 'Sự kiện công nghệ và sáng tạo lớn nhất năm.',
    date: new Date('2026-07-05T09:00:00+07:00'),
    time: '09:00',
    location: 'Trung tâm Hội nghị GEM Center',
    city: 'hcm' as const,
    maxAttendees: 1500,
    organizer: 'VN Tech Community',
    category: 'Hội thảo & Workshop',
    categorySlug: 'hoi-thao',
    status: 'published' as const,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
    priceFrom: 300000,
    isFree: false,
    isFeatured: true,
    isTrending: true,
  },
  {
    title: 'EDM Beach Party - Sunset Vibes',
    description: 'Bữa tiệc âm nhạc điện tử bên bờ biển.',
    date: new Date('2026-06-30T16:00:00+07:00'),
    time: '16:00',
    location: 'Bãi biển An Bàng, Hội An',
    city: 'other' as const,
    maxAttendees: 800,
    organizer: 'Sunset Events',
    category: 'Nhạc sống',
    categorySlug: 'nhac-song',
    status: 'published' as const,
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    priceFrom: 450000,
    isFree: false,
    isFeatured: false,
    isTrending: true,
  },
  {
    title: 'Đêm Nhạc Jazz Sài Gòn',
    description: 'Một đêm nhạc Jazz ấm cúng tại Cargo Bar.',
    date: new Date('2026-07-02T20:00:00+07:00'),
    time: '20:00',
    location: 'Cargo Bar, Quận 7',
    city: 'hcm' as const,
    maxAttendees: 200,
    organizer: 'Cargo Bar',
    category: 'Nhạc sống',
    categorySlug: 'nhac-song',
    status: 'published' as const,
    imageUrl: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop',
    priceFrom: 250000,
    isFree: false,
    isFeatured: false,
    isTrending: false,
  },
  {
    title: 'Giải Bóng Rổ 3x3 Toàn Quốc',
    description: 'Giải đấu bóng rổ 3x3 quy tụ các đội mạnh nhất cả nước.',
    date: new Date('2026-07-10T08:00:00+07:00'),
    time: '08:00',
    location: 'Nhà thi đấu Phan Đình Phùng',
    city: 'hcm' as const,
    maxAttendees: 1000,
    organizer: 'Liên đoàn Bóng rổ Việt Nam',
    category: 'Thể Thao',
    categorySlug: 'the-thao',
    status: 'published' as const,
    imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop',
    priceFrom: 0,
    isFree: true,
    isFeatured: false,
    isTrending: false,
  },
];

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);

  for (const c of categories) {
    await Category.findOneAndUpdate({ slug: c.slug }, c, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  }
  console.log(`✅ Đã seed ${categories.length} categories`);

  for (const s of stars) {
    await Star.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  }
  console.log(`✅ Đã seed ${stars.length} stars`);

  for (const b of banners) {
    await Banner.findOneAndUpdate({ title: b.title }, b, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  }
  console.log(`✅ Đã seed ${banners.length} banners`);

  for (const e of events) {
    await Event.findOneAndUpdate({ title: e.title }, e, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
  }
  console.log(`✅ Đã seed ${events.length} events (published)`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed homepage thất bại:', err?.message || err);
  console.error('   → Kiểm tra MONGODB_URI trong backend/.env và đảm bảo MongoDB đang chạy.');
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
