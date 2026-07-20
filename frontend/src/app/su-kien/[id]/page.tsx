import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import MobileBottomNav from "@/components/home/MobileBottomNav";
import EventDetailHero from "@/components/event-detail/EventDetailHero";
import StickyPurchaseBar from "@/components/event-detail/StickyPurchaseBar";
import EventIntro from "@/components/event-detail/EventIntro";
import EventSchedule from "@/components/event-detail/EventSchedule";
import EventOrganizer from "@/components/event-detail/EventOrganizer";
import RelatedEvents from "@/components/event-detail/RelatedEvents";
import { fetchEventDetail } from "@/lib/discovery-api";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await fetchEventDetail(id);
  const event = detail?.event;
  return {
    title: event ? `${event.title} | EventBox` : "Sự kiện | EventBox",
    description: event
      ? `${event.title} — ${event.location}. Đặt vé trên EventBox.`
      : undefined,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await fetchEventDetail(id);
  if (!detail) notFound();

  const { event, related } = detail;

  return (
    <>
      <Header />
      <StickyPurchaseBar event={event} />
      <main className={styles.main}>
        <EventDetailHero event={event} extraDates={detail.showDates.length - 1} />

        <div className={styles.content}>
          <div className={styles.left}>
            <EventIntro blocks={detail.description} html={detail.descriptionHtml} />
            <EventSchedule showDates={detail.showDates} time={event.time} eventId={event.id} />
            <EventOrganizer organizer={detail.organizer} />
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.promo}>
              <span className={styles.promoBrand}>EventBox</span>
              <p className={styles.promoTitle}>Đặt vé nhanh chóng & an toàn</p>
              <ul className={styles.promoList}>
                <li>Vé điện tử — vào cổng nhanh bằng mã QR</li>
                <li>Thanh toán bảo mật, hoàn tiền theo chính sách</li>
                <li>Hỗ trợ đặt nhóm & quà tặng</li>
              </ul>
              <a href={`/su-kien/${id}/dat-ve`} className={styles.promoCta}>Chọn suất & mua vé</a>
            </div>
          </aside>
        </div>

        <RelatedEvents events={related} />
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
