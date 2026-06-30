export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  image: string;
  category: string;
  isFeatured?: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export const categories: CategoryItem[] = [
  { id: "1", name: "Âm nhạc", icon: "🎵", slug: "am-nhac" },
  { id: "2", name: "Sân khấu", icon: "🎭", slug: "san-khau" },
  { id: "3", name: "Thể thao", icon: "⚽", slug: "the-thao" },
  { id: "4", name: "Workshop", icon: "🎨", slug: "workshop" },
  { id: "5", name: "Hội thảo", icon: "🎤", slug: "hoi-thao" },
  { id: "6", name: "Cộng đồng", icon: "🤝", slug: "cong-dong" },
  { id: "7", name: "Ẩm thực", icon: "🍜", slug: "am-thuc" },
  { id: "8", name: "Du lịch", icon: "✈️", slug: "du-lich" },
  { id: "9", name: "Phim ảnh", icon: "🎬", slug: "phim-anh" },
  { id: "10", name: "Khác", icon: "🎯", slug: "khac" },
];

export const featuredEvents: EventItem[] = [
  {
    id: "f1",
    title: "Đại Nhạc Hội Âm Nhạc Quốc Tế 2026",
    date: "28/06/2026",
    time: "18:00",
    location: "Nhà hát Hòa Bình, TP.HCM",
    price: "500.000đ",
    image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop",
    category: "Âm nhạc",
    isFeatured: true,
  },
  {
    id: "f2",
    title: "Festival Sáng Tạo & Công Nghệ Việt Nam",
    date: "05/07/2026",
    time: "09:00",
    location: "Trung tâm Hội nghị GEM Center",
    price: "300.000đ",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop",
    category: "Hội thảo",
    isFeatured: true,
  },
  {
    id: "f3",
    title: "Liveshow Mỹ Tâm - Tri Ân",
    date: "12/07/2026",
    time: "19:30",
    location: "Sân vận động Phú Thọ",
    price: "800.000đ",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop",
    category: "Âm nhạc",
    isFeatured: true,
  },
  {
    id: "f4",
    title: "Triển Lãm Nghệ Thuật Đương Đại",
    date: "20/07/2026",
    time: "10:00",
    location: "Bảo tàng Mỹ thuật TP.HCM",
    price: "Miễn phí",
    image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=600&h=400&fit=crop",
    category: "Workshop",
    isFeatured: true,
  },
];

export const trendingEvents: EventItem[] = [
  {
    id: "t1",
    title: "EDM Beach Party - Sunset Vibes",
    date: "30/06/2026",
    time: "16:00",
    location: "Bãi biển An Bàng, Hội An",
    price: "450.000đ",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop",
    category: "Âm nhạc",
  },
  {
    id: "t2",
    title: "Giải Marathon Quốc Tế Đà Nẵng",
    date: "15/07/2026",
    time: "05:00",
    location: "Cầu Rồng, Đà Nẵng",
    price: "350.000đ",
    image: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=400&fit=crop",
    category: "Thể thao",
  },
  {
    id: "t3",
    title: "Hội Chợ Ẩm Thực Đường Phố Sài Gòn",
    date: "22/07/2026",
    time: "17:00",
    location: "Phố đi bộ Nguyễn Huệ",
    price: "Miễn phí",
    image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    category: "Ẩm thực",
  },
  {
    id: "t4",
    title: "Workshop Nhiếp Ảnh Chân Dung",
    date: "25/07/2026",
    time: "14:00",
    location: "Studio A, Quận 3",
    price: "200.000đ",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=400&fit=crop",
    category: "Workshop",
  },
];

export const upcomingEvents: EventItem[] = [
  {
    id: "u1",
    title: "Đêm Nhạc Jazz Sài Gòn",
    date: "02/07/2026",
    time: "20:00",
    location: "Cargo Bar, Quận 7",
    price: "250.000đ",
    image: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop",
    category: "Âm nhạc",
  },
  {
    id: "u2",
    title: "Kịch Nói - Tôi Đi Tìm Tôi",
    date: "08/07/2026",
    time: "19:00",
    location: "Nhà hát Tuổi Trẻ, Hà Nội",
    price: "180.000đ",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
    category: "Sân khấu",
  },
  {
    id: "u3",
    title: "Giải Bóng Rổ 3x3 Toàn Quốc",
    date: "10/07/2026",
    time: "08:00",
    location: "Nhà thi đấu Phan Đình Phùng",
    price: "Miễn phí",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=400&fit=crop",
    category: "Thể thao",
  },
  {
    id: "u4",
    title: "Startup Meetup - AI & Future",
    date: "18/07/2026",
    time: "18:30",
    location: "Dreamplex, Quận 1",
    price: "100.000đ",
    image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=600&h=400&fit=crop",
    category: "Hội thảo",
  },
];

export interface FeaturedStar {
  id: string;
  name: string;
  image: string;
  slug: string;
  verified?: boolean;
}

/* Featured Stars (nghệ sĩ / đơn vị tổ chức nổi bật) — portrait placeholders */
export const featuredStars: FeaturedStar[] = [
  { id: "s1", name: "SS Label", slug: "ss-label", verified: true, image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=240&h=240&fit=crop" },
  { id: "s2", name: "Phùng Khánh Linh", slug: "phung-khanh-linh", verified: true, image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&h=240&fit=crop" },
  { id: "s3", name: "Jun Phạm", slug: "jun-pham", verified: true, image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&h=240&fit=crop" },
  { id: "s4", name: "Subicha", slug: "subicha", verified: true, image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&h=240&fit=crop" },
  { id: "s5", name: "Tăng Phúc", slug: "tang-phuc", verified: true, image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=240&h=240&fit=crop" },
  { id: "s6", name: "Quốc Thiên", slug: "quoc-thien", verified: true, image: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&h=240&fit=crop" },
  { id: "s7", name: "Nhà Hát Kịch Thanh Niên", slug: "nha-hat-kich-thanh-nien", verified: true, image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&h=240&fit=crop" },
  { id: "s8", name: "Kịch IDECAF", slug: "kich-idecaf", verified: true, image: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=240&h=240&fit=crop" },
  { id: "s9", name: "Hà Anh Tuấn", slug: "ha-anh-tuan", verified: true, image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&h=240&fit=crop" },
  { id: "s10", name: "Mỹ Tâm", slug: "my-tam", verified: true, image: "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=240&h=240&fit=crop" },
];

export const banners = [
  {
    id: "b1",
    title: "Đại Nhạc Hội Quốc Tế 2026",
    subtitle: "Trải nghiệm âm nhạc đỉnh cao cùng các nghệ sĩ hàng đầu",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1400&h=500&fit=crop",
    cta: "Mua vé ngay",
    link: "#",
  },
  {
    id: "b2",
    title: "Festival Mùa Hè Đà Nẵng",
    subtitle: "Lễ hội pháo hoa, âm nhạc và ẩm thực đặc sắc",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&h=500&fit=crop",
    cta: "Khám phá ngay",
    link: "#",
  },
  {
    id: "b3",
    title: "Workshop Nghệ Thuật Sáng Tạo",
    subtitle: "Khơi nguồn cảm hứng với các nghệ nhân hàng đầu",
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1400&h=500&fit=crop",
    cta: "Đăng ký ngay",
    link: "#",
  },
];

/* ── Explore / search-results page ──────────────────────────
   Larger pool consumed by /su-kien for filtering + infinite scroll.
   `city` + `categorySlug` drive the filter panel; `isFree` mirrors
   a "Miễn phí" price. Dates are DD/MM/YYYY. */
export type EventCity = "hcm" | "hanoi" | "dalat" | "other";

export interface ExploreEvent extends EventItem {
  city: EventCity;
  categorySlug: string;
  isFree: boolean;
  collections: string[]; // featured | trending | upcoming
}

type ExploreSeed = Omit<ExploreEvent, "collections">;

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=400&fit=crop`;

const exploreSeed: ExploreSeed[] = [
  { id: "e1", title: "[BẾN THÀNH] Đêm nhạc Thuỳ Dung - Special Guest: Samuel An", date: "03/07/2026", time: "20:00", location: "Nhà hát Bến Thành, TP.HCM", price: "Từ 300.000đ", isFree: false, image: img("1470229722913-7c0e2dbbafd3"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e2", title: "Chillpark: Liveshow Thanh Xuân Của Tôi", date: "04/07/2026", time: "19:30", location: "Nhà hát Âu Cơ, TP.HCM", price: "Từ 1.500.000đ", isFree: false, image: img("1493225457124-a3eb161ffa5f"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e3", title: "[CAT&MOUSE] Phương Linh + Đình Dũng", date: "04/07/2026", time: "20:00", location: "37B Phạm Ngọc Thạch, TP.HCM", price: "Từ 600.000đ", isFree: false, image: img("1501281668745-f7f57925c3b4"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e4", title: "[BẾN THÀNH] Đêm nhạc Cẩm Ly - Special Guest: Quốc Đại", date: "04/07/2026", time: "20:00", location: "Nhà hát Bến Thành, TP.HCM", price: "Từ 500.000đ", isFree: false, image: img("1459749411175-04bf5292ceea"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e5", title: "[BẾN THÀNH] Đêm nhạc Đỗ Hoàng Hiệp - Hà Lê - Huy R", date: "09/07/2026", time: "20:00", location: "Nhà hát Bến Thành, TP.HCM", price: "Từ 350.000đ", isFree: false, image: img("1514525253161-7a46d19cd819"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e6", title: "[CAT&MOUSE] Thành Vá - Hiếu Minh", date: "10/07/2026", time: "20:00", location: "37B Phạm Ngọc Thạch, TP.HCM", price: "Từ 400.000đ", isFree: false, image: img("1415201364774-f6f0bb35f28f"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e7", title: "[BẾN THÀNH] Đêm nhạc Hà Trần - Nguyễn Đình Tuấn Dũng", date: "11/07/2026", time: "20:00", location: "Nhà hát Bến Thành, TP.HCM", price: "Từ 550.000đ", isFree: false, image: img("1470229722913-7c0e2dbbafd3"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e8", title: "Liveshow Secret Garden - Hà Nhi", date: "11/07/2026", time: "20:00", location: "Cung VH Hữu nghị Việt Xô, Hà Nội", price: "Từ 700.000đ", isFree: false, image: img("1493225457124-a3eb161ffa5f"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hanoi" },
  { id: "e9", title: "Kịch IDECAF: Cậu Đồng", date: "12/07/2026", time: "19:30", location: "Sân khấu IDECAF, TP.HCM", price: "Từ 250.000đ", isFree: false, image: img("1507003211169-0a1dd7228f2d"), category: "Sân khấu", categorySlug: "san-khau", city: "hcm" },
  { id: "e10", title: "Nhà Hát Kịch Thanh Niên: Romeo & Juliet", date: "15/07/2026", time: "19:00", location: "Nhà hát Tuổi Trẻ, Hà Nội", price: "Từ 220.000đ", isFree: false, image: img("1524368535928-5b5e00ddc76b"), category: "Sân khấu", categorySlug: "san-khau", city: "hanoi" },
  { id: "e11", title: "Triển Lãm Nghệ Thuật Đương Đại", date: "20/07/2026", time: "10:00", location: "Bảo tàng Mỹ thuật TP.HCM", price: "Miễn phí", isFree: true, image: img("1531058020387-3be344556be6"), category: "Sân khấu", categorySlug: "san-khau", city: "hcm" },
  { id: "e12", title: "Giải Marathon Quốc Tế Đà Nẵng", date: "15/07/2026", time: "05:00", location: "Cầu Rồng, Đà Nẵng", price: "Từ 350.000đ", isFree: false, image: img("1452626038306-9aae5e071dd3"), category: "Thể thao", categorySlug: "the-thao", city: "other" },
  { id: "e13", title: "Giải Bóng Rổ 3x3 Toàn Quốc", date: "10/07/2026", time: "08:00", location: "NTĐ Phan Đình Phùng, TP.HCM", price: "Miễn phí", isFree: true, image: img("1546519638-68e109498ffc"), category: "Thể thao", categorySlug: "the-thao", city: "hcm" },
  { id: "e14", title: "VnExpress Marathon Đà Lạt", date: "02/08/2026", time: "04:30", location: "Quảng trường Lâm Viên, Đà Lạt", price: "Từ 450.000đ", isFree: false, image: img("1429962714451-bb934ecdc4ec"), category: "Thể thao", categorySlug: "the-thao", city: "dalat" },
  { id: "e15", title: "Hội Thảo Khởi Nghiệp AI & Tương Lai", date: "18/07/2026", time: "18:30", location: "Dreamplex, Quận 1, TP.HCM", price: "Từ 100.000đ", isFree: false, image: img("1591115765373-5207764f72e7"), category: "Hội thảo", categorySlug: "hoi-thao", city: "hcm" },
  { id: "e16", title: "Workshop Nhiếp Ảnh Chân Dung", date: "25/07/2026", time: "14:00", location: "Studio A, Quận 3, TP.HCM", price: "Từ 200.000đ", isFree: false, image: img("1516035069371-29a1b244cc32"), category: "Hội thảo", categorySlug: "hoi-thao", city: "hcm" },
  { id: "e17", title: "Festival Sáng Tạo & Công Nghệ Việt Nam", date: "05/07/2026", time: "09:00", location: "Trung tâm Hội nghị Quốc gia, Hà Nội", price: "Từ 300.000đ", isFree: false, image: img("1540575467063-178a50c2df87"), category: "Hội thảo", categorySlug: "hoi-thao", city: "hanoi" },
  { id: "e18", title: "Tour Khám Phá Đà Lạt Mộng Mơ 2N1Đ", date: "22/07/2026", time: "07:00", location: "Khởi hành tại Đà Lạt", price: "Từ 1.200.000đ", isFree: false, image: img("1469474968028-56623f02e42e"), category: "Tham quan", categorySlug: "tham-quan", city: "dalat" },
  { id: "e19", title: "Trải Nghiệm Chèo SUP Hồ Tuyền Lâm", date: "28/07/2026", time: "06:00", location: "Hồ Tuyền Lâm, Đà Lạt", price: "Từ 350.000đ", isFree: false, image: img("1470770841072-f978cf4d019e"), category: "Tham quan", categorySlug: "tham-quan", city: "dalat" },
  { id: "e20", title: "Tour Ẩm Thực Đường Phố Sài Gòn", date: "22/07/2026", time: "17:00", location: "Phố đi bộ Nguyễn Huệ, TP.HCM", price: "Miễn phí", isFree: true, image: img("1555939594-58d7cb561ad1"), category: "Tham quan", categorySlug: "tham-quan", city: "hcm" },
  { id: "e21", title: "Đêm Nhạc Jazz Sài Gòn", date: "02/07/2026", time: "20:00", location: "Cargo Bar, Quận 7, TP.HCM", price: "Từ 250.000đ", isFree: false, image: img("1415201364774-f6f0bb35f28f"), category: "Nhạc sống", categorySlug: "nhac-song", city: "hcm" },
  { id: "e22", title: "EDM Beach Party - Sunset Vibes", date: "30/06/2026", time: "16:00", location: "Bãi biển An Bàng, Hội An", price: "Từ 450.000đ", isFree: false, image: img("1514525253161-7a46d19cd819"), category: "Nhạc sống", categorySlug: "nhac-song", city: "other" },
  { id: "e23", title: "Lễ Hội Pháo Hoa Quốc Tế", date: "12/07/2026", time: "19:00", location: "Sông Hàn, Đà Nẵng", price: "Từ 800.000đ", isFree: false, image: img("1492684223066-81342ee5ff30"), category: "Khác", categorySlug: "khac", city: "other" },
  { id: "e24", title: "Phiên Chợ Đồ Cũ & Vintage Market", date: "19/07/2026", time: "09:00", location: "Hà Nội Creative City", price: "Miễn phí", isFree: true, image: img("1488459716781-31db52582fe9"), category: "Khác", categorySlug: "khac", city: "hanoi" },
  { id: "e25", title: "Workshop Gốm Tô Vẽ", date: "30/06/2026", time: "10:00 - 18:00", location: "Từ Lâu Space - Phú Nhuận, TP.HCM", price: "Từ 80.000đ", isFree: false, image: img("1516035069371-29a1b244cc32"), category: "Hội thảo", categorySlug: "hoi-thao", city: "hcm" },
];

/* Collection membership — drives the home "Xem tất cả" links
   (/su-kien?collection=<key>). Events may belong to several. */
const FEATURED_IDS = new Set(["e1", "e2", "e3", "e4", "e7", "e8", "e17", "e23", "e25"]);
const TRENDING_IDS = new Set(["e2", "e5", "e6", "e12", "e13", "e20", "e22", "e24"]);
const UPCOMING_IDS = new Set(["e21", "e2", "e3", "e4", "e17", "e5", "e6", "e13"]);

export const exploreEvents: ExploreEvent[] = exploreSeed.map((e) => ({
  ...e,
  collections: [
    ...(FEATURED_IDS.has(e.id) ? ["featured"] : []),
    ...(TRENDING_IDS.has(e.id) ? ["trending"] : []),
    ...(UPCOMING_IDS.has(e.id) ? ["upcoming"] : []),
  ],
}));

export const collectionLabels: Record<string, string> = {
  featured: "Sự kiện nổi bật",
  trending: "Xu hướng",
  upcoming: "Sắp diễn ra",
};

/* Filter-panel option lists (single source of truth for labels/slugs) */
export const cityOptions: { value: EventCity | "all"; label: string }[] = [
  { value: "all", label: "Toàn quốc" },
  { value: "hcm", label: "Hồ Chí Minh" },
  { value: "hanoi", label: "Hà Nội" },
  { value: "dalat", label: "Đà Lạt" },
  { value: "other", label: "Vị trí khác" },
];

export const categoryOptions: { slug: string; label: string }[] = [
  { slug: "nhac-song", label: "Nhạc sống" },
  { slug: "san-khau", label: "Sân khấu & Nghệ thuật" },
  { slug: "the-thao", label: "Thể Thao" },
  { slug: "hoi-thao", label: "Hội thảo & Workshop" },
  { slug: "tham-quan", label: "Tham quan & Trải nghiệm" },
  { slug: "khac", label: "Khác" },
];

/* ── Event detail page ──────────────────────────────────────
   Rich content shown on /su-kien/[id]. A few events have curated
   detail; the rest fall back to a generic version built from base
   fields (see getEventDetail). */
export type ContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export interface Organizer {
  name: string;
  logo: string;
  description: string;
}

export interface EventDetail {
  showDates: string[]; // DD/MM/YYYY — every date the event runs
  description: ContentBlock[];
  organizer: Organizer;
}

/* Workshop Gốm runs daily: 30/06 + all of July → 1 + 31 suất. */
function dailyShowDates(): string[] {
  const out = ["30/06/2026"];
  for (let d = 1; d <= 31; d += 1) out.push(`${String(d).padStart(2, "0")}/07/2026`);
  return out;
}

const eventDetails: Record<string, EventDetail> = {
  e25: {
    showDates: dailyShowDates(),
    organizer: {
      name: "Từ Lâu Space",
      logo: img("1493106641515-6b5631de4bb9"),
      description:
        "Từ Lâu tạo lập không gian thực hành thủ công và nghệ thuật cho tất cả mọi người, lấy việc thực hành làm trung tâm nhằm tăng cường cảm hứng sáng tạo và kết nối cảm xúc của người tham gia. Các workshop không phải là lớp học chuyên sâu nên dễ tiếp cận, thân thiện với cả trẻ em và người mới bắt đầu.",
    },
    description: [
      { type: "heading", text: "THÔNG TIN ĐẶT LỊCH" },
      {
        type: "paragraph",
        text: "Từ Lâu Space mở cửa từ 9H-21H mỗi ngày. Một buổi workshop kéo dài 3 tiếng, bạn có thể đặt lịch theo khung giờ tự chọn hoặc theo các ca workshop tiêu chuẩn.",
      },
      { type: "heading", text: "Thời gian các ca workshop tiêu chuẩn" },
      {
        type: "list",
        items: [
          "Ca sáng: 10-13H",
          "Ca chiều: 14-17H",
          "Ca tối: 18-21H (phụ thu 30K/người, miễn phụ thu cho nhóm trên 4 người)",
        ],
      },
      {
        type: "paragraph",
        text: "Tiệm có thể linh động thời gian theo nhu cầu của bạn, nhưng tốt nhất bạn hãy tham gia đúng thời gian tiêu chuẩn để nhân viên hỗ trợ trọn vẹn nhất. Vui lòng liên hệ Tiệm trước nếu muốn đặt ca tối hoặc đặt ngoài khung giờ tiêu chuẩn.",
      },
      { type: "heading", text: "THÔNG TIN WORKSHOP" },
      {
        type: "paragraph",
        text: "GỐM TÔ VẼ là gói trải nghiệm sáng tạo trên các phôi gốm có sẵn như ly, chén, tô, đĩa và đồ vật trang trí. Bạn chỉ cần chọn mẫu yêu thích và tự do tô điểm bằng màu sắc, họa tiết hoặc nét vẽ mang phong cách riêng. Dễ thực hiện, phù hợp cho mọi lứa tuổi.",
      },
      {
        type: "list",
        items: [
          "Giá vé: 80K/người",
          "Phí nung: Đã bao gồm trong giá phôi. Sản phẩm thứ 2 trở lên chỉ tính phụ phí nung.",
          "Hơn 50 mẫu phôi gốm trắng để lựa chọn.",
          "Có người hướng dẫn từ A-Z.",
        ],
      },
      { type: "heading", text: "Đối tượng phù hợp" },
      {
        type: "list",
        items: [
          "Người muốn trải nghiệm trọn bộ từ A-Z",
          "Gia đình, nhóm bạn yêu thủ công",
          "Khách du lịch hoặc khách ghé trải nghiệm ngắn ngày",
          "Làm sản phẩm hoàn chỉnh để sử dụng hoặc làm quà tặng",
        ],
      },
      { type: "heading", text: "Bảng giá phôi gốm" },
      {
        type: "list",
        items: [
          "Muỗng, tượng nhỏ, lót ly: 50 - 95K",
          "Mặt dây chuyền, móc khóa: 25K",
          "Ly trơn không quai, chén bát: 125 - 195K",
          "Ly có quai/họa tiết thú: 155 - 325K",
          "Tô, đĩa lớn, đồ trang trí: 175 - 275K",
          "Ống heo, chậu cây, tô lớn: 185 - 385K",
        ],
      },
    ],
  },
};

/* Look up any event (explore pool + home sections) by id. */
export function findEventById(id: string): EventItem | undefined {
  return [
    ...exploreEvents,
    ...featuredEvents,
    ...trendingEvents,
    ...upcomingEvents,
  ].find((e) => e.id === id);
}

/* Curated detail when available, otherwise a generic one from base fields. */
export function getEventDetail(event: EventItem): EventDetail {
  const specific = eventDetails[event.id];
  if (specific) return specific;
  return {
    showDates: [event.date],
    organizer: {
      name: "EventBox Organizer",
      logo: "",
      description:
        "Đơn vị tổ chức trên nền tảng EventBox. Theo dõi để cập nhật các sự kiện mới nhất.",
    },
    description: [
      {
        type: "paragraph",
        text: `${event.title} diễn ra tại ${event.location}. Đặt vé sớm để không bỏ lỡ trải nghiệm hấp dẫn này.`,
      },
      { type: "heading", text: "Thông tin sự kiện" },
      {
        type: "list",
        items: [
          `Thời gian: ${event.time}, ${event.date}`,
          `Địa điểm: ${event.location}`,
          `Giá vé: ${event.price}`,
        ],
      },
    ],
  };
}
