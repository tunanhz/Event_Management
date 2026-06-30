import EventCard, { type EventItem } from '@/components/home/EventCard';
import styles from './RelatedEvents.module.css';

interface RelatedEventsProps {
  events: EventItem[];
}

export default function RelatedEvents({ events }: RelatedEventsProps) {
  if (events.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Có thể bạn cũng thích</h2>
      <div className={styles.grid}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
