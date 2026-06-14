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
