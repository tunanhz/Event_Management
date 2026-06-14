import EventCard, { EventItem } from './EventCard';
import styles from './EventSection.module.css';

interface EventSectionProps {
  title: string;
  events: EventItem[];
  showViewAll?: boolean;
}

export default function EventSection({ title, events, showViewAll = true }: EventSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {showViewAll && (
            <a href="#" className={styles.viewAllLink}>
              Xem tất cả →
            </a>
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
