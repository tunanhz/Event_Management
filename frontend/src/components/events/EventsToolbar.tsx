'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { categoryOptions } from '@/lib/mockData';
import { DATE_LABELS, type DateFilter, type Filters } from './events-types';
import { fromISODate } from './filter-events';
import FilterPanel from './FilterPanel';
import DatePanel from './DatePanel';
import styles from './EventsToolbar.module.css';

interface EventsToolbarProps {
  heading?: string;
  filters: Filters;
  dateFilter: DateFilter;
  today: Date;
  onApplyFilters: (f: Filters) => void;
  onResetFilters: () => void;
  onApplyDate: (d: DateFilter) => void;
  onResetDate: () => void;
  onRemoveCategory: (slug: string) => void;
}

function dateButtonLabel(dateFilter: DateFilter): string {
  if (dateFilter.mode === 'date' && dateFilter.date) {
    const d = fromISODate(dateFilter.date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  return DATE_LABELS[dateFilter.mode];
}

export default function EventsToolbar({
  heading,
  filters,
  dateFilter,
  today,
  onApplyFilters,
  onResetFilters,
  onApplyDate,
  onResetDate,
  onRemoveCategory,
}: EventsToolbarProps) {
  const [open, setOpen] = useState<'date' | 'filter' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside-click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filterCount =
    (filters.city !== 'all' ? 1 : 0) + (filters.free ? 1 : 0) + filters.categories.length;

  const activeCategories = categoryOptions.filter((c) => filters.categories.includes(c.slug));
  const dateActive = dateFilter.mode !== 'all';

  return (
    <div className={styles.toolbar} ref={rootRef}>
      <h1 className={styles.heading}>{heading ?? 'Kết quả tìm kiếm:'}</h1>

      <div className={styles.actions}>
        {/* Date picker */}
        <div className={styles.anchor}>
          <button
            type="button"
            className={`${styles.btn} ${open === 'date' || dateActive ? styles.btnActive : ''}`}
            aria-expanded={open === 'date'}
            aria-haspopup="dialog"
            onClick={() => setOpen(open === 'date' ? null : 'date')}
          >
            <Calendar size={16} />
            <span>{dateButtonLabel(dateFilter)}</span>
            <ChevronDown size={16} className={styles.caret} />
          </button>
          {open === 'date' && (
            <div className={styles.popover}>
              <DatePanel
                initial={dateFilter}
                today={today}
                onApply={(d) => {
                  onApplyDate(d);
                  setOpen(null);
                }}
                onReset={onResetDate}
              />
            </div>
          )}
        </div>

        {/* Filter */}
        <div className={styles.anchor}>
          <button
            type="button"
            className={`${styles.btn} ${open === 'filter' || filterCount > 0 ? styles.btnActive : ''}`}
            aria-expanded={open === 'filter'}
            aria-haspopup="dialog"
            onClick={() => setOpen(open === 'filter' ? null : 'filter')}
          >
            <SlidersHorizontal size={16} />
            <span>Bộ lọc</span>
            {filterCount > 0 && <span className={styles.badge}>{filterCount}</span>}
            <ChevronDown size={16} className={styles.caret} />
          </button>
          {open === 'filter' && (
            <div className={styles.popoverRight}>
              <FilterPanel
                initial={filters}
                onApply={(f) => {
                  onApplyFilters(f);
                  setOpen(null);
                }}
                onReset={onResetFilters}
              />
            </div>
          )}
        </div>

        {/* Active category chips (removable) */}
        {activeCategories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={styles.catChip}
            onClick={() => onRemoveCategory(c.slug)}
            aria-label={`Bỏ lọc ${c.label}`}
          >
            <span>{c.label}</span>
            <X size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}
