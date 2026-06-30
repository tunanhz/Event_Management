import { ChevronRight } from 'lucide-react';
import type { EventItem } from '@/lib/mockData';
import { formatLongDate, priceValue } from './format-date';
import styles from './EventDetailHero.module.css';

interface EventDetailHeroProps {
  event: EventItem;
  extraDates: number; // showDates.length - 1
}

export default function EventDetailHero({ event, extraDates }: EventDetailHeroProps) {
  const isFree = event.price === 'Miễn phí';
  const [venue, ...rest] = event.location.split(',');
  const address = rest.join(',').trim();

  return (
    <section className={styles.hero}>
      <div className={styles.card}>
        {/* Left — event summary */}
        <div className={styles.info}>
          <h1 className={styles.title}>{event.title}</h1>

          <div className={styles.metaRow}>
            <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{event.time}, {formatLongDate(event.date)}</span>
          </div>

          {extraDates > 0 && <span className={styles.daysBadge}>+ {extraDates} ngày khác</span>}

          <div className={styles.locationRow}>
            <svg className={styles.metaIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className={styles.venue}>{venue}</span>
          </div>
          {address && <p className={styles.address}>{address}</p>}

          <div className={styles.divider} />

          <a href="#lich-dien" className={styles.priceRow}>
            {isFree ? (
              <span className={styles.priceFree}>Miễn phí</span>
            ) : (
              <>
                <span className={styles.priceLabel}>Giá từ</span>
                <span className={styles.priceValue}>{priceValue(event.price)}</span>
              </>
            )}
            <ChevronRight className={styles.priceChevron} size={20} />
          </a>

          <a href="#lich-dien" className={styles.buyBtn}>Mua vé ngay</a>
        </div>

        {/* Ticket-stub perforation */}
        <span className={styles.notchTop} aria-hidden="true" />
        <span className={styles.notchBottom} aria-hidden="true" />

        {/* Right — poster */}
        <div className={styles.posterWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.image} alt={event.title} className={styles.poster} />
        </div>
      </div>
    </section>
  );
}
