'use client';

import Link from 'next/link';
import styles from './EventCard.module.css';

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  image: string;
  category: string;
}

interface EventCardProps {
  event: EventItem;
}

export default function EventCard({ event }: EventCardProps) {
  const isFree = event.price === 'Miễn phí';

  return (
    <Link href={`/su-kien/${event.id}`} className={styles.card}>
      {/* Image Section */}
      <div className={styles.imageWrapper}>
        <img
          src={event.image}
          alt={event.title}
          className={styles.image}
          loading="lazy"
        />
        <span className={styles.categoryBadge}>{event.category}</span>
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        <h3 className={styles.title}>{event.title}</h3>

        {/* Date & Time Row */}
        <div className={styles.infoRow}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{event.date}</span>
          <span className={styles.dateSeparator}>•</span>
          <span>{event.time}</span>
        </div>

        {/* Location Row */}
        <div className={styles.locationRow}>
          <svg
            className={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{event.location}</span>
        </div>

        {/* Price */}
        <div className={isFree ? styles.priceFree : styles.price}>
          {event.price}
        </div>
      </div>
    </Link>
  );
}
