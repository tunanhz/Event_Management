'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, List, CalendarDays } from 'lucide-react';
import SectionCard from './SectionCard';
import { formatLongDate } from './format-date';
import styles from './EventSchedule.module.css';

const WEEKDAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

interface EventScheduleProps {
  showDates: string[]; // DD/MM/YYYY
  time: string;
}

interface YMD { d: number; m: number; y: number }

const parse = (s: string): YMD => {
  const [d, m, y] = s.split('/').map(Number);
  return { d, m, y };
};

const addMonths = (y: number, m: number, n: number) => {
  const idx = m - 1 + n;
  return { y: y + Math.floor(idx / 12), m: (((idx % 12) + 12) % 12) + 1 };
};

export default function EventSchedule({ showDates, time }: EventScheduleProps) {
  const parsed = showDates.map(parse);
  const sorted = [...parsed].sort((a, b) => a.y - b.y || a.m - b.m || a.d - b.d);
  const first = sorted[0];

  // 5 consecutive month tabs from the earliest show month.
  const tabs = Array.from({ length: 5 }, (_, i) => {
    const { y, m } = addMonths(first.y, first.m, i);
    const days = parsed.filter((p) => p.y === y && p.m === m).map((p) => p.d).sort((a, b) => a - b);
    return { y, m, days };
  });

  const firstActiveTab = Math.max(0, tabs.findIndex((t) => t.days.length > 0));
  const [tabIndex, setTabIndex] = useState(firstActiveTab);
  const [selectedDay, setSelectedDay] = useState<number | null>(tabs[firstActiveTab].days[0] ?? null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const stripRef = useRef<HTMLDivElement>(null);

  const active = tabs[tabIndex];
  const showSet = new Set(active.days);

  const selectTab = (i: number) => {
    setTabIndex(i);
    setSelectedDay(tabs[i].days[0] ?? null);
  };

  const scrollStrip = (dir: number) =>
    stripRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });

  // Calendar grid for the active month (Monday-first).
  const offset = (new Date(active.y, active.m - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(active.y, active.m, 0).getDate();
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < offset; i += 1) cells.push(<span key={`b${i}`} className={styles.cellEmpty} />);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const isShow = showSet.has(d);
    const isSelected = isShow && selectedDay === d;
    cells.push(
      <button
        key={d}
        type="button"
        disabled={!isShow}
        className={`${styles.cell} ${isShow ? styles.cellActive : ''} ${isSelected ? styles.cellSelected : ''}`}
        onClick={() => setSelectedDay(d)}
        aria-pressed={isSelected}
      >
        {String(d).padStart(2, '0')}
        {isShow && <span className={styles.dot} aria-hidden="true" />}
      </button>,
    );
  }

  const viewToggle = (
    <div className={styles.viewToggle} role="group" aria-label="Kiểu hiển thị lịch">
      <button
        type="button"
        className={view === 'list' ? styles.viewOn : styles.viewBtn}
        aria-pressed={view === 'list'}
        aria-label="Dạng danh sách"
        onClick={() => setView('list')}
      >
        <List size={16} />
      </button>
      <button
        type="button"
        className={view === 'calendar' ? styles.viewOn : styles.viewBtn}
        aria-pressed={view === 'calendar'}
        aria-label="Dạng lịch"
        onClick={() => setView('calendar')}
      >
        <CalendarDays size={16} />
      </button>
    </div>
  );

  return (
    <SectionCard title="Lịch diễn" id="lich-dien" action={viewToggle}>
      {/* Month tabs */}
      <div className={styles.tabsRow}>
        <button type="button" className={styles.tabArrow} onClick={() => scrollStrip(-1)} aria-label="Xem tháng trước">
          <ChevronLeft size={18} />
        </button>
        <div className={styles.tabStrip} ref={stripRef}>
          {tabs.map((t, i) => (
            <button
              key={`${t.y}-${t.m}`}
              type="button"
              className={`${styles.tab} ${i === tabIndex ? styles.tabOn : ''}`}
              onClick={() => selectTab(i)}
              aria-pressed={i === tabIndex}
            >
              <span className={styles.tabMonth}>
                {i === 0 ? `Tháng ${t.m}, ${t.y}` : `Th ${t.m}`}
              </span>
              <span className={styles.tabCount}>{t.days.length} suất diễn</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.tabArrow} onClick={() => scrollStrip(1)} aria-label="Xem tháng sau">
          <ChevronRight size={18} />
        </button>
      </div>

      {active.days.length === 0 ? (
        <p className={styles.empty}>Chưa có suất diễn trong tháng này.</p>
      ) : view === 'calendar' ? (
        <div className={styles.calendar}>
          <div className={styles.weekRow}>
            {WEEKDAYS.map((w) => <span key={w} className={styles.weekday}>{w}</span>)}
          </div>
          <div className={styles.grid}>{cells}</div>
        </div>
      ) : (
        <ul className={styles.list}>
          {active.days.map((d) => {
            const iso = `${String(d).padStart(2, '0')}/${String(active.m).padStart(2, '0')}/${active.y}`;
            return (
              <li key={d} className={styles.listItem}>
                <div>
                  <span className={styles.listDate}>{formatLongDate(iso)}</span>
                  <span className={styles.listTime}>{time}</span>
                </div>
                <a href="#" className={styles.listBuy}>Mua vé</a>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
