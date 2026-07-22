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

  let isPast = false;
  if (event.date) {
    const parts = event.date.split('/');
    let d: Date | null = null;
    if (parts.length === 3) {
      d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 23, 59, 59);
    } else {
      d = new Date(event.date);
    }
    if (d && !Number.isNaN(d.getTime())) {
      isPast = d.getTime() < Date.now();
    }
  }

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
              <p className={styles.promoTitle}>
                {!isPast ? "Đặt vé nhanh chóng & an toàn" : "Sự kiện đã diễn ra"}
              </p>
              <ul className={styles.promoList}>
                <li>Vé điện tử — vào cổng nhanh bằng mã QR</li>
                <li>Thanh toán bảo mật, hoàn tiền theo chính sách</li>
                <li>Hỗ trợ đặt nhóm & quà tặng</li>
              </ul>
              {!isPast ? (
                <a href={`/su-kien/${id}/dat-ve`} className={styles.promoCta}>Chọn suất & mua vé</a>
              ) : (
                <button disabled className={`${styles.promoCta} opacity-50 cursor-not-allowed pointer-events-none bg-slate-700`}>
                  Sự kiện đã kết thúc
                </button>
              )}
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
