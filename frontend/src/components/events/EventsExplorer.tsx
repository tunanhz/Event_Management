'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import EventCard from '@/components/home/EventCard';
import { Spinner } from '@/components/ui/Spinner';
import { categoryOptions, collectionLabels, exploreEvents } from '@/lib/mockData';
import { applyFilters, startOfDay } from './filter-events';
import { DEFAULT_DATE, DEFAULT_FILTERS, type DateFilter, type Filters } from './events-types';
import EventsToolbar from './EventsToolbar';
import styles from './EventsExplorer.module.css';

const PAGE_SIZE = 8;

interface EventsExplorerProps {
  /** Seed the category filter from the URL (e.g. /su-kien?category=the-thao). */
  initialCategory?: string;
  /** Pin a collection (featured | trending | upcoming) from the URL. */
  initialCollection?: string;
}

export default function EventsExplorer({ initialCategory, initialCollection }: EventsExplorerProps) {
  // A valid collection is fixed for this page mount (the URL key remounts on change).
  const collection = initialCollection && collectionLabels[initialCollection] ? initialCollection : null;

  // Stable "today" for the lifetime of the page.
  const [today] = useState(() => startOfDay(new Date()));
  const [filters, setFilters] = useState<Filters>(() => {
    const valid = initialCategory && categoryOptions.some((c) => c.slug === initialCategory);
    return valid ? { ...DEFAULT_FILTERS, categories: [initialCategory] } : DEFAULT_FILTERS;
  });
  const [dateFilter, setDateFilter] = useState<DateFilter>(DEFAULT_DATE);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => applyFilters(exploreEvents, filters, dateFilter, today, collection),
    [filters, dateFilter, today, collection],
  );

  // Mutating filters/date always restarts paging at the first page.
  const updateFilters = (f: Filters) => {
    setFilters(f);
    setVisibleCount(PAGE_SIZE);
  };
  const updateDate = (d: DateFilter) => {
    setDateFilter(d);
    setVisibleCount(PAGE_SIZE);
  };

  const hasMore = visibleCount < filtered.length;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll — load the next page when the sentinel enters the viewport.
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, filtered.length]);

  const shown = filtered.slice(0, visibleCount);

  return (
    <div className={styles.wrapper}>
      <EventsToolbar
        heading={collection ? collectionLabels[collection] : undefined}
        filters={filters}
        dateFilter={dateFilter}
        today={today}
        onApplyFilters={updateFilters}
        onResetFilters={() => updateFilters(DEFAULT_FILTERS)}
        onApplyDate={updateDate}
        onResetDate={() => updateDate(DEFAULT_DATE)}
        onRemoveCategory={(slug) =>
          updateFilters({ ...filters, categories: filters.categories.filter((s) => s !== slug) })
        }
      />

      <p className={styles.count}>
        <strong>{filtered.length}</strong> sự kiện
      </p>

      {shown.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Không tìm thấy sự kiện phù hợp</p>
          <p className={styles.emptyHint}>Thử điều chỉnh bộ lọc hoặc chọn khoảng ngày khác.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {shown.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true">
          <Spinner />
        </div>
      )}
    </div>
  );
}
