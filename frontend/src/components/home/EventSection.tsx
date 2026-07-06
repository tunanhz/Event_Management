import type { ReactNode } from 'react';
import Link from 'next/link';
import EventCard, { EventItem } from './EventCard';
import styles from './EventSection.module.css';

interface EventSectionProps {
  title: string;
  icon?: ReactNode;
  events: EventItem[];
  showViewAll?: boolean;
  viewAllHref?: string;
}

export default function EventSection({
  title,
  icon,
  events,
  showViewAll = true,
  viewAllHref = '/su-kien',
}: EventSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {icon && <span className={styles.titleIcon}>{icon}</span>}
            {title}
          </h2>
          {showViewAll && (
            <Link href={viewAllHref} className={styles.viewAllLink}>
              Xem tất cả →
            </Link>
          )}
        </div>
        <div className={styles.grid}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
}
