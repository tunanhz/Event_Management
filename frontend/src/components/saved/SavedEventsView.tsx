"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import EventCard from "@/components/home/EventCard";
import { findEventById, type EventItem } from "@/lib/mockData";
import { useSavedEvents } from "@/lib/use-saved-events";
import styles from "./saved-events-view.module.css";

/**
 * "Sự kiện đã lưu" list. Resolves saved IDs (localStorage) to event data and
 * renders the shared EventCard grid, with an empty state when nothing is saved.
 */
export function SavedEventsView() {
  const { savedIds } = useSavedEvents();
  const events = savedIds
    .map(findEventById)
    .filter((e): e is EventItem => Boolean(e));

  return (
    <div className={styles.container}>
      <header className={styles.head}>
        <h1 className={styles.title}>Sự kiện đã lưu</h1>
        <p className={styles.subtitle}>
          {events.length > 0
            ? `${events.length} sự kiện bạn đã lưu`
            : "Lưu lại những sự kiện bạn quan tâm để xem sau"}
        </p>
      </header>

      {events.length === 0 ? (
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
