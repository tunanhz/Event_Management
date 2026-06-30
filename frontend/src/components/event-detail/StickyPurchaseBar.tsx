'use client';

import type { EventItem } from '@/lib/mockData';
import { useScrollState } from '@/lib/use-scroll-hide';
import styles from './StickyPurchaseBar.module.css';

interface StickyPurchaseBarProps {
  event: EventItem;
}

export default function StickyPurchaseBar({ event }: StickyPurchaseBarProps) {
  const { y, dir } = useScrollState();
  // Appears in the header's place while scrolling down past the hero.
  const visible = dir === 'down' && y > 420;

  const [venue] = event.location.split(',');

  return (
    <div className={`${styles.bar} ${visible ? styles.visible : ''}`} aria-hidden={!visible}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{event.title}</h2>

        <div className={styles.location}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{venue}</span>
        </div>

        <a href="#lich-dien" className={styles.buyBtn} tabIndex={visible ? 0 : -1}>
          Mua vé ngay
        </a>
      </div>
    </div>
  );
}
