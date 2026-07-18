import type { Metadata } from "next";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import EventsExplorer from "@/components/events/EventsExplorer";
import { fetchExploreEvents, fetchSearchEvents } from "@/lib/discovery-api";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Khám phá sự kiện | EventBox",
  description:
    "Tìm và lọc sự kiện theo địa điểm, ngày và thể loại — âm nhạc, sân khấu, thể thao, workshop và nhiều hơn nữa trên EventBox.",
};

/**
 * Events listing / search-results page (/su-kien).
 * Header + filter toolbar + infinite-scroll grid + footer + bottom nav.
 * `?category=<slug>` (from header sub-nav) seeds the category filter;
 * `?q=<text>` (from the header search bar) switches the pool to search results.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; collection?: string; q?: string }>;
}) {
  const { category, collection, q } = await searchParams;
  const query = q?.trim() || undefined;
  const events = query ? await fetchSearchEvents(query) : await fetchExploreEvents();
  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* key remounts the explorer so a new ?category/?collection/?q fully reseeds state */}
        <EventsExplorer
          key={`${collection ?? ""}|${category ?? ""}|${query ?? ""}`}
          events={events}
          initialCategory={category}
          initialCollection={collection}
          searchQuery={query}
        />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
