'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateFilter, DateMode } from './events-types';
import { startOfDay, toISODate } from './filter-events';
import styles from './DatePanel.module.css';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const PRESETS: { mode: DateMode; label: string }[] = [
  { mode: 'all', label: 'Tất cả các ngày' },
  { mode: 'today', label: 'Hôm nay' },
  { mode: 'tomorrow', label: 'Ngày mai' },
  { mode: 'weekend', label: 'Cuối tuần này' },
  { mode: 'month', label: 'Tháng này' },
];

const monthLabel = (m: number, y: number) => `Tháng ${String(m + 1).padStart(2, '0')}, ${y}`;

interface MonthGridProps {
  year: number;
  month: number;
  today: Date;
  selected: string | null;
  onPick: (iso: string) => void;
}

function MonthGrid({ year, month, today, selected, onPick }: MonthGridProps) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayTime = startOfDay(today).getTime();

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < offset; i += 1) {
    cells.push(<span key={`blank-${i}`} className={styles.cellEmpty} />);
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    const date = new Date(year, month, d);
    const iso = toISODate(date);
    const isPast = date.getTime() < todayTime;
    const isToday = date.getTime() === todayTime;
    const isSelected = selected === iso;
    const cls = [
      styles.cell,
      isToday ? styles.today : '',
      isSelected ? styles.selected : '',
    ]
      .filter(Boolean)
      .join(' ');
    cells.push(
      <button
        key={iso}
        type="button"
        disabled={isPast}
        className={cls}
        onClick={() => onPick(iso)}
        aria-pressed={isSelected}
        aria-current={isToday ? 'date' : undefined}
        aria-label={`${d} ${monthLabel(month, year)}`}
      >
        {d}
      </button>,
    );
  }

  return (
    <div className={styles.month}>
      <div className={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={styles.weekday}>{w}</span>
        ))}
      </div>
      <div className={styles.grid}>{cells}</div>
    </div>
  );
}

interface DatePanelProps {
  initial: DateFilter;
  today: Date;
  onApply: (date: DateFilter) => void;
  onReset: () => void;
}

export default function DatePanel({ initial, today, onApply, onReset }: DatePanelProps) {
  const [mode, setMode] = useState<DateMode>(initial.mode);
  const [selected, setSelected] = useState<string | null>(initial.date);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const rightMonth = (viewMonth + 1) % 12;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  // Don't allow paging before the current month.
  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  const goPrev = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pick = (iso: string) => {
    setSelected(iso);
    setMode('date');
  };

  const choosePreset = (m: DateMode) => {
    setMode(m);
    setSelected(null);
  };

  const handleReset = () => {
    setMode('all');
    setSelected(null);
    onReset();
  };

  const applyDisabled = mode === 'date' && !selected;

  return (
    <div className={styles.panel} role="dialog" aria-label="Chọn ngày">
      {/* Quick presets */}
      <div className={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p.mode}
            type="button"
            className={`${styles.preset} ${mode === p.mode ? styles.presetOn : ''}`}
            aria-pressed={mode === p.mode}
            onClick={() => choosePreset(p.mode)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      {/* Dual-month calendar */}
      <div className={styles.calendarHeader}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Tháng trước"
        >
          <ChevronLeft size={18} />
        </button>
        <span className={styles.monthTitle}>{monthLabel(viewMonth, viewYear)}</span>
        <span className={styles.monthTitleRight}>{monthLabel(rightMonth, rightYear)}</span>
        <button type="button" className={styles.navBtn} onClick={goNext} aria-label="Tháng sau">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className={styles.months}>
        <MonthGrid year={viewYear} month={viewMonth} today={today} selected={selected} onPick={pick} />
        <MonthGrid year={rightYear} month={rightMonth} today={today} selected={selected} onPick={pick} />
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.resetBtn} onClick={handleReset}>
          Thiết lập lại
        </button>
        <button
          type="button"
          className={styles.applyBtn}
          disabled={applyDisabled}
          onClick={() => onApply({ mode, date: mode === 'date' ? selected : null })}
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}
