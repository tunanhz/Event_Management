'use client';

import Link from 'next/link';
import { featuredStars } from '@/lib/mockData';
import styles from './FeaturedStars.module.css';

/* Cyan "verified" badge — filled circle + white check (≥3:1 contrast) */
function VerifiedBadge() {
  return (
    <svg className={styles.verified} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#0891b2" />
      <path d="M7.5 12.2l3 3 6-6.4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FeaturedStars() {
  return (
    <section className={styles.section} aria-labelledby="featured-stars-title">
      {/* Cyan aurora ambiance (decorative, gated by reduced-motion globally) */}
      <div className={styles.aurora} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="featured-stars-title" className={styles.title}>
            <svg className={styles.starIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.5l2.9 6.06 6.6.79-4.86 4.54 1.27 6.51L12 17.9l-5.91 3.0 1.27-6.51L2.5 9.35l6.6-.79L12 2.5z" />
            </svg>
            Featured Stars
          </h2>
          <Link href="/nghe-si" className={styles.viewAll}>
            Xem thêm
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        <ul className={styles.list}>
          {featuredStars.map((star) => (
            <li key={star.id} className={styles.item}>
              <Link href={`/nghe-si/${star.slug}`} className={styles.card}>
                <span className={styles.avatarRing}>
                  <img
                    src={star.image}
                    alt={star.name}
                    className={styles.avatar}
                    loading="lazy"
                  />
                </span>
                <span className={styles.nameRow}>
                  <span className={styles.name}>{star.name}</span>
                  {star.verified && <VerifiedBadge />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
