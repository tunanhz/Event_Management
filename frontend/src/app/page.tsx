import type { Metadata } from "next";
import styles from "./page.module.css";
import Header from "@/components/home/Header";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryNav from "@/components/home/CategoryNav";
import EventSection from "@/components/home/EventSection";
import Footer from "@/components/home/Footer";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import {
  featuredEvents,
  trendingEvents,
  upcomingEvents,
} from "@/lib/mockData";

export const metadata: Metadata = {
  title: "Trang chủ | EventBox - Mua vé sự kiện trực tuyến",
  description:
    "Khám phá vô vàn sự kiện âm nhạc, sân khấu, thể thao, workshop & quản lý sự kiện trực tuyến thật dễ dàng trên EventBox.",
  keywords: [
    "vé sự kiện",
    "hòa nhạc",
    "workshop",
    "thể thao",
    "quản lý sự kiện",
  ],
};

/**
 * Home Page - Ticketbox-style Homepage
 * Features: Header, Hero Banner, Category Nav, Event Sections, Footer
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <HeroBanner />
        <CategoryNav />

        <div className={styles.sectionDivider} />

        <EventSection
          title="🔥 Sự kiện nổi bật"
          events={featuredEvents}
          showViewAll={true}
        />

        <div className={styles.sectionDivider} />

        <EventSection
          title="📈 Xu hướng"
          events={trendingEvents}
          showViewAll={true}
        />

        <div className={styles.sectionDivider} />

        <EventSection
          title="📅 Sắp diễn ra"
          events={upcomingEvents}
          showViewAll={true}
        />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
