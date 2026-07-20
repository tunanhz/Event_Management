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
      if (filter === "all") return true;

      const eventDate = parseDateString(event.date);
      if (!eventDate) return false;
      eventDate.setHours(0, 0, 0, 0);

      const diffTime = eventDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (filter === "week") {
        // Within 7 days
        return diffDays >= 0 && diffDays <= 7;
      }
      if (filter === "month") {
        // Within 30 days
        return diffDays >= 0 && diffDays <= 30;
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
