'use client';

import { useState } from 'react';
import { cityOptions, categoryOptions, type EventCity } from '@/lib/mockData';
import type { Filters } from './events-types';
import styles from './FilterPanel.module.css';

interface FilterPanelProps {
  initial: Filters;
  onApply: (filters: Filters) => void;
  onReset: () => void;
}

export default function FilterPanel({ initial, onApply, onReset }: FilterPanelProps) {
  const [city, setCity] = useState<EventCity | 'all'>(initial.city);
  const [free, setFree] = useState<boolean>(initial.free);
  const [categories, setCategories] = useState<string[]>(initial.categories);

  const toggleCategory = (slug: string) =>
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );

  const handleReset = () => {
    setCity('all');
    setFree(false);
    setCategories([]);
    onReset();
  };

  return (
    <div className={styles.panel} role="dialog" aria-label="Bộ lọc sự kiện">
      <div className={styles.body}>
        {/* Location */}
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Vị trí</h3>
          <div className={styles.radios}>
            {cityOptions.map((opt) => (
              <label key={opt.value} className={styles.radio}>
                <input
                  type="radio"
                  name="event-city"
                  className={styles.radioInput}
                  checked={city === opt.value}
                  onChange={() => setCity(opt.value)}
                />
                <span className={styles.radioDot} aria-hidden="true" />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className={styles.divider} />

        {/* Price */}
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Giá tiền</h3>
          <div className={styles.toggleRow}>
            <span>Miễn phí</span>
            <button
              type="button"
              role="switch"
              aria-checked={free}
              aria-label="Chỉ hiển thị sự kiện miễn phí"
              className={`${styles.switch} ${free ? styles.switchOn : ''}`}
              onClick={() => setFree((v) => !v)}
            >
              <span className={styles.knob} />
            </button>
          </div>
        </section>

        <div className={styles.divider} />

        {/* Category */}
        <section className={styles.group}>
          <h3 className={styles.groupTitle}>Thể loại</h3>
          <div className={styles.chips}>
            {categoryOptions.map((c) => {
              const active = categories.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  aria-pressed={active}
                  className={`${styles.chip} ${active ? styles.chipOn : ''}`}
                  onClick={() => toggleCategory(c.slug)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.resetBtn} onClick={handleReset}>
          Thiết lập lại
        </button>
        <button
          type="button"
          className={styles.applyBtn}
          onClick={() => onApply({ city, free, categories })}
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}
