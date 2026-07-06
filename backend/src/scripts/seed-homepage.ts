/**
 * Seed reference data + sample published events for the homepage & discovery
 * pages (categories, featured stars, hero banners, and the full explore event
 * pool that mirrors the FE mock in mockData.ts).
 *
 * Usage: npm run seed:homepage
 * Idempotent: upserts by slug/title so re-running is safe.
 */
import mongoose from 'mongoose';
import { config } from '../config';
import { Category } from '../modules/category/category.model';
import { Star } from '../modules/star/star.model';
import { Banner } from '../modules/banner/banner.model';
import { Event, EventCity } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';

const categories = [
  { name: 'Nhạc sống', slug: 'nhac-song', icon: '🎵', order: 1 },
  { name: 'Sân khấu & Nghệ thuật', slug: 'san-khau', icon: '🎭', order: 2 },
  { name: 'Thể Thao', slug: 'the-thao', icon: '⚽', order: 3 },
  { name: 'Hội thảo & Workshop', slug: 'hoi-thao', icon: '🎤', order: 4 },
  { name: 'Tham quan & Trải nghiệm', slug: 'tham-quan', icon: '✈️', order: 5 },
  { name: 'Khác', slug: 'khac', icon: '🎯', order: 6 },
];

const star = (id: string) => `https://images.unsplash.com/photo-${id}?w=240&h=240&fit=crop`;
const stars = [
  { name: 'SS Label', slug: 'ss-label', verified: true, imageUrl: star('1535713875002-d1d0cf377fde'), order: 1 },
  { name: 'Phùng Khánh Linh', slug: 'phung-khanh-linh', verified: true, imageUrl: star('1494790108377-be9c29b29330'), order: 2 },
  { name: 'Jun Phạm', slug: 'jun-pham', verified: true, imageUrl: star('1500648767791-00dcc994a43e'), order: 3 },
  { name: 'Subicha', slug: 'subicha', verified: true, imageUrl: star('1438761681033-6461ffad8d80'), order: 4 },
  { name: 'Tăng Phúc', slug: 'tang-phuc', verified: true, imageUrl: star('1506794778202-cad84cf45f1d'), order: 5 },
  { name: 'Quốc Thiên', slug: 'quoc-thien', verified: true, imageUrl: star('1492562080023-ab3db95bfbce'), order: 6 },
  { name: 'Nhà Hát Kịch Thanh Niên', slug: 'nha-hat-kich-thanh-nien', verified: true, imageUrl: star('1534528741775-53994a69daeb'), order: 7 },
  { name: 'Kịch IDECAF', slug: 'kich-idecaf', verified: true, imageUrl: star('1463453091185-61582044d556'), order: 8 },
  { name: 'Hà Anh Tuấn', slug: 'ha-anh-tuan', verified: true, imageUrl: star('1517841905240-472988babdf9'), order: 9 },
  { name: 'Mỹ Tâm', slug: 'my-tam', verified: true, imageUrl: star('1502823403499-6ccfcf4fb453'), order: 10 },
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
  {
    title: 'Workshop Nghệ Thuật Sáng Tạo',
    subtitle: 'Khơi nguồn cảm hứng với các nghệ nhân hàng đầu',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1400&h=500&fit=crop',
    ctaLabel: 'Đăng ký ngay',
    order: 3,
    isActive: true,
  },
];

const CATEGORY_NAME: Record<string, string> = {
  'nhac-song': 'Nhạc sống',
  'san-khau': 'Sân khấu & Nghệ thuật',
  'the-thao': 'Thể Thao',
  'hoi-thao': 'Hội thảo & Workshop',
  'tham-quan': 'Tham quan & Trải nghiệm',
  khac: 'Khác',
};

const eImg = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&h=400&fit=crop`;

/** DD/MM/YYYY + HH:mm → Date (local +07 clock preserved via ISO offset). */
function toDate(dmy: string, time: string): Date {
  const [d, m, y] = dmy.split('/');
  return new Date(`${y}-${m}-${d}T${time}:00+07:00`);
}

// [title, DD/MM/YYYY, HH:mm, location, priceFrom(0=free), photoId, categorySlug, city, featured, trending]
type Row = [string, string, string, string, number, string, string, EventCity, boolean, boolean];

const EXPLORE: Row[] = [
  ['[BẾN THÀNH] Đêm nhạc Thuỳ Dung - Special Guest: Samuel An', '03/07/2026', '20:00', 'Nhà hát Bến Thành, TP.HCM', 300000, '1470229722913-7c0e2dbbafd3', 'nhac-song', 'hcm', true, false],
  ['Chillpark: Liveshow Thanh Xuân Của Tôi', '04/07/2026', '19:30', 'Nhà hát Âu Cơ, TP.HCM', 1500000, '1493225457124-a3eb161ffa5f', 'nhac-song', 'hcm', true, true],
  ['[CAT&MOUSE] Phương Linh + Đình Dũng', '04/07/2026', '20:00', '37B Phạm Ngọc Thạch, TP.HCM', 600000, '1501281668745-f7f57925c3b4', 'nhac-song', 'hcm', true, false],
  ['[BẾN THÀNH] Đêm nhạc Cẩm Ly - Special Guest: Quốc Đại', '04/07/2026', '20:00', 'Nhà hát Bến Thành, TP.HCM', 500000, '1459749411175-04bf5292ceea', 'nhac-song', 'hcm', true, false],
  ['[BẾN THÀNH] Đêm nhạc Đỗ Hoàng Hiệp - Hà Lê - Huy R', '09/07/2026', '20:00', 'Nhà hát Bến Thành, TP.HCM', 350000, '1514525253161-7a46d19cd819', 'nhac-song', 'hcm', false, true],
  ['[CAT&MOUSE] Thành Vá - Hiếu Minh', '10/07/2026', '20:00', '37B Phạm Ngọc Thạch, TP.HCM', 400000, '1415201364774-f6f0bb35f28f', 'nhac-song', 'hcm', false, true],
  ['[BẾN THÀNH] Đêm nhạc Hà Trần - Nguyễn Đình Tuấn Dũng', '11/07/2026', '20:00', 'Nhà hát Bến Thành, TP.HCM', 550000, '1470229722913-7c0e2dbbafd3', 'nhac-song', 'hcm', true, false],
  ['Liveshow Secret Garden - Hà Nhi', '11/07/2026', '20:00', 'Cung VH Hữu nghị Việt Xô, Hà Nội', 700000, '1493225457124-a3eb161ffa5f', 'nhac-song', 'hanoi', true, false],
  ['Kịch IDECAF: Cậu Đồng', '12/07/2026', '19:30', 'Sân khấu IDECAF, TP.HCM', 250000, '1507003211169-0a1dd7228f2d', 'san-khau', 'hcm', false, false],
  ['Nhà Hát Kịch Thanh Niên: Romeo & Juliet', '15/07/2026', '19:00', 'Nhà hát Tuổi Trẻ, Hà Nội', 220000, '1524368535928-5b5e00ddc76b', 'san-khau', 'hanoi', false, false],
  ['Triển Lãm Nghệ Thuật Đương Đại', '20/07/2026', '10:00', 'Bảo tàng Mỹ thuật TP.HCM', 0, '1531058020387-3be344556be6', 'san-khau', 'hcm', false, false],
  ['Giải Marathon Quốc Tế Đà Nẵng', '15/07/2026', '05:00', 'Cầu Rồng, Đà Nẵng', 350000, '1452626038306-9aae5e071dd3', 'the-thao', 'other', false, true],
  ['Giải Bóng Rổ 3x3 Toàn Quốc', '10/07/2026', '08:00', 'NTĐ Phan Đình Phùng, TP.HCM', 0, '1546519638-68e109498ffc', 'the-thao', 'hcm', false, true],
  ['VnExpress Marathon Đà Lạt', '02/08/2026', '04:30', 'Quảng trường Lâm Viên, Đà Lạt', 450000, '1429962714451-bb934ecdc4ec', 'the-thao', 'dalat', false, false],
  ['Hội Thảo Khởi Nghiệp AI & Tương Lai', '18/07/2026', '18:30', 'Dreamplex, Quận 1, TP.HCM', 100000, '1591115765373-5207764f72e7', 'hoi-thao', 'hcm', false, false],
  ['Workshop Nhiếp Ảnh Chân Dung', '25/07/2026', '14:00', 'Studio A, Quận 3, TP.HCM', 200000, '1516035069371-29a1b244cc32', 'hoi-thao', 'hcm', false, false],
  ['Festival Sáng Tạo & Công Nghệ Việt Nam', '05/07/2026', '09:00', 'Trung tâm Hội nghị Quốc gia, Hà Nội', 300000, '1540575467063-178a50c2df87', 'hoi-thao', 'hanoi', true, false],
  ['Tour Khám Phá Đà Lạt Mộng Mơ 2N1Đ', '22/07/2026', '07:00', 'Khởi hành tại Đà Lạt', 1200000, '1469474968028-56623f02e42e', 'tham-quan', 'dalat', false, false],
  ['Trải Nghiệm Chèo SUP Hồ Tuyền Lâm', '28/07/2026', '06:00', 'Hồ Tuyền Lâm, Đà Lạt', 350000, '1470770841072-f978cf4d019e', 'tham-quan', 'dalat', false, false],
  ['Tour Ẩm Thực Đường Phố Sài Gòn', '22/07/2026', '17:00', 'Phố đi bộ Nguyễn Huệ, TP.HCM', 0, '1555939594-58d7cb561ad1', 'tham-quan', 'hcm', false, true],
  ['Đêm Nhạc Jazz Sài Gòn', '02/07/2026', '20:00', 'Cargo Bar, Quận 7, TP.HCM', 250000, '1415201364774-f6f0bb35f28f', 'nhac-song', 'hcm', false, false],
  ['EDM Beach Party - Sunset Vibes', '30/06/2026', '16:00', 'Bãi biển An Bàng, Hội An', 450000, '1514525253161-7a46d19cd819', 'nhac-song', 'other', false, true],
  ['Lễ Hội Pháo Hoa Quốc Tế', '12/07/2026', '19:00', 'Sông Hàn, Đà Nẵng', 800000, '1492684223066-81342ee5ff30', 'khac', 'other', true, false],
  ['Phiên Chợ Đồ Cũ & Vintage Market', '19/07/2026', '09:00', 'Hà Nội Creative City', 0, '1488459716781-31db52582fe9', 'khac', 'hanoi', false, true],
  ['Workshop Gốm Tô Vẽ', '30/06/2026', '10:00', 'Từ Lâu Space - Phú Nhuận, TP.HCM', 80000, '1516035069371-29a1b244cc32', 'hoi-thao', 'hcm', true, false],
];

const events = EXPLORE.map(
  ([title, dmy, time, location, priceFrom, photo, slug, city, isFeatured, isTrending]) => {
    const date = toDate(dmy, time);
    return {
      title,
      description: `${title} diễn ra tại ${location}. Đặt vé sớm để không bỏ lỡ trải nghiệm hấp dẫn này.`,
      date,
      time,
      location,
      city,
      maxAttendees: 1000,
      organizer: 'EventBox Organizer',
      category: CATEGORY_NAME[slug],
      categorySlug: slug,
      status: 'published' as const,
      imageUrl: eImg(photo),
      priceFrom,
      isFree: priceFrom === 0,
      isFeatured,
      isTrending,
      sessions: [{ date, time }],
    };
  }
);

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
    const doc = await Event.findOneAndUpdate({ title: e.title }, e, {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    });
    // A default "Vé Standard" tier per event so it's bookable (dat-ve) and can
    // back registrations. Upsert by eventId keeps re-runs idempotent.
    if (doc) {
      await Ticket.findOneAndUpdate(
        { eventId: doc._id, ticketName: 'Vé Standard' },
        {
          eventId: doc._id,
          ticketName: 'Vé Standard',
          description: 'Vé vào cửa tiêu chuẩn',
          price: e.priceFrom,
          quantity: 500,
          minPerOrder: 1,
          maxPerOrder: 10,
          saleStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
          saleEnd: e.date,
          status: 'ACTIVE',
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }
  }
  console.log(`✅ Đã seed ${events.length} events (published) + vé Standard mỗi event`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Seed homepage thất bại:', err?.message || err);
  console.error('   → Kiểm tra MONGODB_URI trong backend/.env và đảm bảo MongoDB đang chạy.');
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
