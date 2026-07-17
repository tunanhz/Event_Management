"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, ChevronRight } from "lucide-react";
import type { EventItem, TicketType } from "@/lib/mockData";
import { formatVnd } from "@/lib/utils";
import {
  buildLines,
  encodeSelection,
  totalAmount,
  totalQuantity,
  type Quantities,
} from "@/lib/booking-selection";
import { formatBookingDate } from "./format-booking-date";
import styles from "./select-tickets-view.module.css";

interface Props {
  event: EventItem;
  tickets: TicketType[];
}

/** Step 1 of booking — pick ticket types and quantities. */
export function SelectTicketsView({ event, tickets }: Props) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Quantities>(() =>
    Object.fromEntries(tickets.map((t) => [t.id, 0])),
  );

  const change = (id: string, delta: number) => {
    const max = tickets.find((t) => t.id === id)?.maxPerOrder ?? Infinity;
    setQuantities((q) => ({ ...q, [id]: Math.min(max, Math.max(0, (q[id] ?? 0) + delta)) }));
  };

  const lines = useMemo(() => buildLines(tickets, quantities), [tickets, quantities]);
  const total = totalAmount(lines);
  const count = totalQuantity(quantities);

  const proceed = () => {
    if (count === 0) return;
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

          <ul className={styles.ticketList}>
            {tickets.map((t, i) => (
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
                    disabled={(quantities[t.id] ?? 0) === 0}
                    aria-label={`Giảm số lượng ${t.name}`}
                  >
                    –
                  </button>
                  <span className={styles.qty} aria-live="polite">{quantities[t.id] ?? 0}</span>
                  <button
                    type="button"
                    className={`${styles.stepBtn} ${styles.stepBtnPlus}`}
                    onClick={() => change(t.id, 1)}
                    disabled={(quantities[t.id] ?? 0) >= t.maxPerOrder}
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
            <span>{event.time}, {formatBookingDate(event.date)}</span>
          </div>
          <div className={styles.metaRow}>
            <MapPin size={18} className={styles.metaIcon} aria-hidden="true" />
            <span>{event.location}</span>
          </div>

          <div className={styles.priceHead}>Giá vé</div>
          <ul className={styles.priceList}>
            {tickets.map((t) => (
              <li key={t.id} className={styles.priceItem}>
                <span>{t.name}</span>
                <span className={styles.priceValue}>{formatVnd(t.price)}</span>
              </li>
            ))}
          </ul>

          {/* Action button — pinned to the bottom of the summary card */}
          <div className={styles.sidebarCta}>
            {count === 0 ? (
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
