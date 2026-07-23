"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, ChevronRight } from "lucide-react";
import type { EventItem, ShowOption, TicketType } from "@/lib/mockData";
import { formatVnd } from "@/lib/utils";
import {
  buildLines,
  encodeSelection,
  totalAmount,
  totalQuantity,
  type Quantities,
} from "@/lib/booking-selection";
import { formatBookingDate } from "./format-booking-date";
import { formatShowTime } from "./format-show-time";
import styles from "./select-tickets-view.module.css";

interface Props {
  event: EventItem;
  tickets: TicketType[];
  shows: ShowOption[];
}

/** Step 1 of booking — pick a showing (if more than one), then ticket types and quantities. */
export function SelectTicketsView({ event, tickets, shows }: Props) {
  const router = useRouter();
  const hasMultipleShows = shows.length > 1;
  const [selectedShowId, setSelectedShowId] = useState<string | undefined>(shows[0]?.id);
  const [quantities, setQuantities] = useState<Quantities>(() =>
    Object.fromEntries(tickets.map((t) => [t.id, 0])),
  );
  const selectedShow = hasMultipleShows ? shows.find((s) => s.id === selectedShowId) : undefined;
  const scheduleText = selectedShow
    ? (() => {
        const { time, date } = formatShowTime(selectedShow.startTime, selectedShow.endTime);
        return `${selectedShow.label} · ${time}, ${date}`;
      })()
    : `${event.time}, ${formatBookingDate(event.date)}`;

  // Only tiers sold for the selected showing (tiers without a showId apply to every showing).
  const visibleTickets = useMemo(
    () =>
      hasMultipleShows
        ? tickets.filter((t) => !t.showId || t.showId === selectedShowId)
        : tickets,
    [tickets, hasMultipleShows, selectedShowId],
  );

  const pickShow = (id: string) => {
    if (id === selectedShowId) return;
    setSelectedShowId(id);
    // A cart line is tied to one showing — switching clears picks from the other.
    setQuantities(Object.fromEntries(tickets.map((t) => [t.id, 0])));
  };

  const change = (id: string, delta: number) => {
    const max = tickets.find((t) => t.id === id)?.maxPerOrder ?? Infinity;
    setQuantities((q) => ({ ...q, [id]: Math.min(max, Math.max(0, (q[id] ?? 0) + delta)) }));
  };

  const lines = useMemo(() => buildLines(visibleTickets, quantities), [visibleTickets, quantities]);
  const total = totalAmount(lines);
  const count = totalQuantity(quantities);

  const isPast = event.isPast ?? false;

  const proceed = () => {
    if (count === 0 || isPast) return;
    router.push(`/su-kien/${event.id}/thanh-toan?${encodeSelection(quantities)}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        {/* Main column */}
        <div className={styles.main}>
          <header className={styles.topbar}>
            <Link href={`/su-kien/${event.id}`} className={styles.back}>
              <ArrowLeft size={20} aria-hidden="true" />
              Trở về
            </Link>
            <h1 className={styles.stepTitle}>Chọn vé</h1>
            <span className={styles.topbarSpacer} aria-hidden="true" />
          </header>

          {isPast && (
            <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-center text-sm font-bold text-rose-500 mb-5">
              🔴 Sự kiện này đã diễn ra/kết thúc. Bạn không thể mua vé cho sự kiện này nữa.
            </div>
          )}

          {hasMultipleShows && (
            <div className={styles.showPicker}>
              <div className={styles.showPickerLabel}>Chọn xuất chiếu</div>
              <div className={styles.showList}>
                {shows.map((s) => {
                  const { time, date } = formatShowTime(s.startTime, s.endTime);
                  const active = s.id === selectedShowId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`${styles.showPill} ${active ? styles.showPillActive : ""}`}
                      aria-pressed={active}
                      onClick={() => pickShow(s.id)}
                    >
                      <span className={styles.showPillTime}>{s.label} · {time}</span>
                      <span className={styles.showPillDate}>{date}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <ul className={styles.ticketList}>
            {visibleTickets.map((t, i) => (
              <li
                key={t.id}
                className={`${styles.ticketRow} ${(quantities[t.id] ?? 0) > 0 ? styles.ticketRowActive : ""}`}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <div className={styles.ticketInfo}>
                  <span className={styles.ticketName}>{t.name}</span>
                  <span className={styles.ticketPrice}>{formatVnd(t.price)}</span>
                </div>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => change(t.id, -1)}
                    disabled={isPast || (quantities[t.id] ?? 0) === 0}
                    aria-label={`Giảm số lượng ${t.name}`}
                  >
                    –
                  </button>
                  <span className={styles.qty} aria-live="polite">{quantities[t.id] ?? 0}</span>
                  <button
                    type="button"
                    className={`${styles.stepBtn} ${styles.stepBtnPlus}`}
                    onClick={() => change(t.id, 1)}
                    disabled={isPast || (quantities[t.id] ?? 0) >= t.maxPerOrder}
                    aria-label={`Tăng số lượng ${t.name}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <h2 className={styles.eventTitle}>{event.title}</h2>
          <div className={styles.metaRow}>
            <Calendar size={18} className={styles.metaIcon} aria-hidden="true" />
            <span>{scheduleText}</span>
          </div>
          <div className={styles.metaRow}>
            <MapPin size={18} className={styles.metaIcon} aria-hidden="true" />
            <span>{event.location}</span>
          </div>

          <div className={styles.priceHead}>Giá vé</div>
          <ul className={styles.priceList}>
            {visibleTickets.map((t) => (
              <li key={t.id} className={styles.priceItem}>
                <span>{t.name}</span>
                <span className={styles.priceValue}>{formatVnd(t.price)}</span>
              </li>
            ))}
          </ul>

          {/* Action button — pinned to the bottom of the summary card */}
          <div className={styles.sidebarCta}>
            {isPast ? (
              <button type="button" className={styles.cta} disabled>
                Sự kiện đã kết thúc
              </button>
            ) : count === 0 ? (
              <button type="button" className={styles.cta} disabled>
                Vui lòng chọn vé
              </button>
            ) : (
              <button type="button" className={`${styles.cta} ${styles.ctaActive}`} onClick={proceed}>
                <span className={styles.ctaTotal}>{formatVnd(total)}</span>
                <span className={styles.ctaLabel}>
                  Tiếp tục <ChevronRight size={18} aria-hidden="true" />
                </span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
