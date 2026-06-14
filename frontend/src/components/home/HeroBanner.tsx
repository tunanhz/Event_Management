'use client';

import { useState, useEffect, useCallback } from 'react';
import { banners } from '@/lib/mockData';
import styles from './HeroBanner.module.css';

const INTERVAL_MS = 5000;

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const total = banners.length;

  const goTo = useCallback((index: number) => {
    setCurrent((index + total) % total);
  }, [total]);

  const goNext = useCallback(() => {
    goTo(current + 1);
  }, [current, goTo]);

  const goPrev = useCallback(() => {
    goTo(current - 1);
  }, [current, goTo]);

  /* Auto-play */
  useEffect(() => {
    const timer = setInterval(goNext, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [goNext]);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.banner}>
          {/* Slides */}
          <div className={styles.slideTrack}>
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`${styles.slide} ${index === current ? styles.slideActive : ''}`}
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className={styles.slideImage}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <div className={styles.overlay} />
                <div className={styles.content}>
                  <h2 className={styles.title}>{banner.title}</h2>
                  <p className={styles.subtitle}>{banner.subtitle}</p>
                  <a href={banner.link}>
                    <button className={styles.ctaButton}>{banner.cta}</button>
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Left Arrow */}
          <button
            className={`${styles.arrowBtn} ${styles.arrowBtnLeft}`}
            onClick={goPrev}
            aria-label="Slide trước"
          >
            <svg className={styles.arrowIcon} viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            className={`${styles.arrowBtn} ${styles.arrowBtnRight}`}
            onClick={goNext}
            aria-label="Slide tiếp theo"
          >
            <svg className={styles.arrowIcon} viewBox="0 0 24 24">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>

          {/* Dot Indicators */}
          <div className={styles.dots}>
            {banners.map((_, index) => (
              <button
                key={index}
                className={`${styles.dot} ${index === current ? styles.dotActive : ''}`}
                onClick={() => goTo(index)}
                aria-label={`Đi tới slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
