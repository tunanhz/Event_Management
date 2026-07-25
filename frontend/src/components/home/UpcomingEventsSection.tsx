"use client";

import { ReactNode, useState, useMemo } from "react";
import Link from "next/link";
import EventCard, { EventItem } from "./EventCard";
import styles from "./UpcomingEventsSection.module.css";

interface UpcomingEventsSectionProps {
  title: string;
  icon?: ReactNode;
  events: EventItem[];
  showViewAll?: boolean;
  viewAllHref?: string;
}

type FilterType = "all" | "week" | "month";

function parseDateString(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

export default function UpcomingEventsSection({
  title,
  icon,
  events,
  showViewAll = true,
  viewAllHref = "/su-kien",
}: UpcomingEventsSectionProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredEvents = useMemo(() => {
    const now = new Date();
    // Set hours to 0 to compare dates only
    now.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      let eventDate = parseDateString(event.date);
      if (!eventDate && event.date) {
        const d = new Date(event.date);
        if (!Number.isNaN(d.getTime())) eventDate = d;
      }
      if (eventDate) {
        const copy = new Date(eventDate);
        copy.setHours(23, 59, 59, 999);
        if (copy < now) return false; // Filter out past events
      }

      if (filter === "all") return true;

      if (!eventDate) return false;
      const dateCopy = new Date(eventDate);
      dateCopy.setHours(0, 0, 0, 0);

      if (filter === "week") {
        // Week runs Monday–Sunday; getDay(): 0=Sun..6=Sat
        const dayOfWeek = now.getDay();
        const daysUntilEndOfWeek = (7 - dayOfWeek) % 7;
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + daysUntilEndOfWeek);
        return dateCopy >= now && dateCopy <= endOfWeek;
      }
      if (filter === "month") {
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(0, 0, 0, 0);
        return dateCopy >= now && dateCopy <= endOfMonth;
      }
      return true;
    });
  }, [events, filter]);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h2 className={styles.title}>
              {icon && <span className={styles.titleIcon}>{icon}</span>}
              {title}
            </h2>
            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`}
                onClick={() => setFilter("all")}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`${styles.tab} ${filter === "week" ? styles.tabActive : ""}`}
                onClick={() => setFilter("week")}
              >
                Trong tuần này
              </button>
              <button
                type="button"
                className={`${styles.tab} ${filter === "month" ? styles.tabActive : ""}`}
                onClick={() => setFilter("month")}
              >
                Trong tháng này
              </button>
            </div>
          </div>
          {showViewAll && (
            <Link href={viewAllHref} className={styles.viewAllLink}>
              Xem tất cả →
            </Link>
          )}
        </div>

        {filteredEvents.length > 0 ? (
          <div className={styles.grid}>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <p>Không có sự kiện sắp diễn ra trong khoảng thời gian này.</p>
          </div>
        )}
      </div>
    </section>
  );
}
