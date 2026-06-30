import type { Metadata } from "next";
import styles from "./page.module.css";
import Header from "@/components/home/Header";
import HeroBanner from "@/components/home/HeroBanner";
import FeaturedStars from "@/components/home/FeaturedStars";
import EventSection from "@/components/home/EventSection";
import Footer from "@/components/home/Footer";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import { Flame, TrendingUp, CalendarClock } from "lucide-react";
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
        <FeaturedStars />

        <div className={styles.sectionDivider} />

        <EventSection
          title="Sự kiện nổi bật"
          icon={<Flame />}
          events={featuredEvents}
          showViewAll={true}
          viewAllHref="/su-kien?collection=featured"
        />

        <div className={styles.sectionDivider} />

        <EventSection
          title="Xu hướng"
          icon={<TrendingUp />}
          events={trendingEvents}
          showViewAll={true}
          viewAllHref="/su-kien?collection=trending"
        />

        <div className={styles.sectionDivider} />

        <EventSection
          title="Sắp diễn ra"
          icon={<CalendarClock />}
          events={upcomingEvents}
          showViewAll={true}
          viewAllHref="/su-kien?collection=upcoming"
        />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
