"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Loader2 } from "lucide-react";
import EventCard from "@/components/home/EventCard";
import type { EventItem } from "@/components/home/EventCard";
import { useSavedEvents } from "@/lib/use-saved-events";
import styles from "./saved-events-view.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/** Fetch a single event by ID from the real backend and map to EventItem. */
async function fetchEventItem(id: string): Promise<EventItem | null> {
  try {
    const res = await fetch(`${API_BASE}/api/events/${id}/detail`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const e = json?.data?.event ?? json?.data ?? null;
    if (!e) return null;

    const formatDate = (iso?: string) => {
      if (!iso) return "Chưa đặt lịch";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "Chưa đặt lịch";
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };

    return {
      id: e._id,
      title: e.title,
      date: formatDate(e.date ?? e.startDate),
      time: e.time || "",
      location: e.location || "Đang cập nhật",
      price:
        e.isFree || !e.priceFrom
          ? "Miễn phí"
          : `Từ ${Number(e.priceFrom).toLocaleString("vi-VN")}đ`,
      image: e.imageUrl || e.banner || "/event-placeholder.svg",
      category: e.category || "Sự kiện",
    };
  } catch {
    return null;
  }
}

/**
 * "Sự kiện đã lưu" list.
 * Resolves saved IDs (localStorage) by calling the real API for each event,
 * then renders the shared EventCard grid.
 */
export function SavedEventsView() {
  const { savedIds } = useSavedEvents();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedIds.length === 0) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(savedIds.map(fetchEventItem)).then((results) => {
      if (cancelled) return;
      setEvents(results.filter((e): e is EventItem => e !== null));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [savedIds]);

  return (
    <div className={styles.container}>
      <header className={styles.head}>
        <h1 className={styles.title}>Sự kiện đã lưu</h1>
        <p className={styles.subtitle}>
          {loading
            ? "Đang tải..."
            : events.length > 0
            ? `${events.length} sự kiện bạn đã lưu`
            : "Lưu lại những sự kiện bạn quan tâm để xem sau"}
        </p>
      </header>

      {loading ? (
        <div className={styles.empty}>
          <Loader2 className="animate-spin h-10 w-10 text-cyan-500 mb-4" />
          <p className={styles.emptyText}>Đang tải sự kiện đã lưu...</p>
        </div>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Bookmark size={40} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className={styles.emptyTitle}>Chưa có sự kiện nào được lưu</h2>
          <p className={styles.emptyText}>
            Nhấn biểu tượng dấu trang trên mỗi sự kiện để lưu vào đây.
          </p>
          <Link href="/su-kien" className={styles.emptyCta}>
            Khám phá sự kiện
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
