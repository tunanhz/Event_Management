"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, CreditCard, QrCode, Wallet, Smartphone, Tag } from "lucide-react";
import type { EventItem, ShowOption, TicketType } from "@/lib/mockData";
import { useAuth } from "@/context/AuthContext";
import { formatVnd } from "@/lib/utils";
import { buildLines, totalAmount, type Quantities } from "@/lib/booking-selection";
import { holdSelection, confirmMockPayments, createVnpayPaymentUrl } from "@/lib/booking-api";
import { formatBookingDate } from "./format-booking-date";
import { formatShowTime } from "./format-show-time";
import styles from "./payment-view.module.css";

interface Props {
  event: EventItem;
  tickets: TicketType[];
  quantities: Quantities;
  shows: ShowOption[];
}

const HOLD_SECONDS = 10 * 60; // 10-minute reservation window (matches backend hold)

const PAYMENT_METHODS = [
  { id: "vnpay", label: "VNPAY/Ứng dụng ngân hàng", Icon: Smartphone, tint: "#0d5cab" },
  { id: "vietqr", label: "VietQR", Icon: QrCode, tint: "#c0392b" },
  { id: "shopeepay", label: "ShopeePay", Icon: Wallet, tint: "#ee4d2d" },
  { id: "zalopay", label: "Zalopay", Icon: Wallet, tint: "#0068ff" },
  { id: "card", label: "Thẻ ghi nợ/Thẻ tín dụng", Icon: CreditCard, tint: "#334155" },
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Step 2 of booking — payment. */
export function PaymentView({ event, tickets, quantities, shows }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const lines = buildLines(tickets, quantities);
  const total = totalAmount(lines);

  // The order is always for a single showing — every line's ticket shares the
  // same showId — so surface that showing's own time instead of the event's
  // generic date/time whenever the event runs more than one.
  const selectedShow =
    shows.length > 1 ? shows.find((s) => s.id === lines[0]?.ticket.showId) : undefined;
  const scheduleText = selectedShow
    ? (() => {
        const { time, date } = formatShowTime(selectedShow.startTime, selectedShow.endTime);
        return `${selectedShow.label} · ${time}, ${date}`;
      })()
    : `${event.time}, ${formatBookingDate(event.date)}`;

  const [remaining, setRemaining] = useState(HOLD_SECONDS);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].id);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expired = remaining <= 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isFree = total === 0;

  // Hold one registration per selected tier, then either redirect to the real
  // VNPAY gateway (leaves the SPA — the buyer lands back on
  // /thanh-toan/vnpay-return after paying) or confirm the remaining, still-
  // simulated methods immediately. Requires a signed-in PARTICIPANT. Free
  // tickets skip the payment method entirely and go straight to the mock
  // confirm — there is nothing to charge, so VNPAY/QR/etc make no sense here.
  const pay = async () => {
    if (paying || expired) return;
    setPaying(true);
    setPayError(null);
    try {
      const registrationIds = await holdSelection(
        event.id,
        lines.map((l) => ({ ticketId: l.ticket.id, quantity: l.qty }))
      );

      if (!isFree && method === "vnpay") {
        const paymentUrl = await createVnpayPaymentUrl(registrationIds);
        window.location.href = paymentUrl;
        return;
      }

      await confirmMockPayments(registrationIds);
      router.push("/ve-cua-toi");
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Thanh toán thất bại — vui lòng thử lại."
      );
      setPaying(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero — full-width band, content aligned to the body container */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroInfo}>
            <h1 className={styles.eventTitle}>{event.title}</h1>
            <div className={styles.metaRow}>
              <Calendar size={17} className={styles.metaIcon} aria-hidden="true" />
              <span>{scheduleText}</span>
            </div>
            <div className={styles.metaRow}>
              <MapPin size={17} className={styles.metaIcon} aria-hidden="true" />
              <span>{event.location}</span>
            </div>
          </div>

          <div className={styles.countdown}>
            <span className={styles.countdownLabel}>Hoàn tất đặt vé trong</span>
            <div className={`${styles.countdownClock} ${remaining <= 60 ? styles.countdownUrgent : ""}`}>
              <span className={styles.countdownBox}>{pad(minutes)}</span>
              <span className={styles.countdownColon}>:</span>
              <span className={styles.countdownBox}>{pad(seconds)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.bodyWrap}>
        <h2 className={styles.sectionHeading}>THANH TOÁN</h2>
        <div className={styles.body}>
          {/* Left column */}
          <div className={styles.left}>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Thông tin nhận vé</h3>
              <p className={styles.receiveText}>
                Vé điện tử sẽ được hiển thị trong mục <strong>&quot;Vé của tôi&quot;</strong> của tài khoản{" "}
                <span className={styles.email}>{user?.email ?? "tài khoản của bạn"}</span>
              </p>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeadRow}>
                <h3 className={styles.cardTitle}>Mã khuyến mãi</h3>
                <button type="button" className={styles.linkBtn}>Chọn voucher</button>
              </div>
              <button type="button" className={styles.promoAdd}>
                <Tag size={15} aria-hidden="true" /> Thêm khuyến mãi
              </button>
            </section>

            {!isFree && (
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Phương thức thanh toán</h3>
                <ul className={styles.methodList}>
                  {PAYMENT_METHODS.map(({ id, label, Icon, tint }) => (
                    <li key={id}>
                      <label className={`${styles.method} ${method === id ? styles.methodActive : ""}`}>
                        <input
                          type="radio"
                          name="payment-method"
                          value={id}
                          checked={method === id}
                          onChange={() => setMethod(id)}
                          className={styles.radio}
                        />
                        <span className={styles.methodIcon} style={{ backgroundColor: tint }}>
                          <Icon size={16} aria-hidden="true" />
                        </span>
                        <span className={styles.methodLabel}>{label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Right column */}
          <aside className={styles.right}>
            <section className={styles.card}>
              <div className={styles.cardHeadRow}>
                <h3 className={styles.cardTitle}>Thông tin đặt vé</h3>
                <Link href={`/su-kien/${event.id}/dat-ve`} className={styles.linkBtn}>Chọn lại vé</Link>
              </div>
              <div className={styles.orderHead}>
                <span>Loại vé</span>
                <span>Số lượng</span>
              </div>
              {lines.map((line) => (
                <div key={line.ticket.id} className={styles.orderLine}>
                  <div>
                    <div className={styles.orderName}>{line.ticket.name}</div>
                    <div className={styles.orderPrice}>{formatVnd(line.ticket.price)}</div>
                  </div>
                  <div className={styles.orderQtyCol}>
                    <div className={styles.orderQty}>{pad(line.qty)}</div>
                    <div className={styles.orderSubtotal}>{formatVnd(line.subtotal)}</div>
                  </div>
                </div>
              ))}
            </section>

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Thông tin đơn hàng</h3>
              <div className={styles.summaryRow}>
                <span>Tạm tính</span>
                <span>{formatVnd(total)}</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.totalRow}>
                <span>Tổng tiền</span>
                <span className={styles.totalValue}>{formatVnd(total)}</span>
              </div>
              <p className={styles.terms}>
                Bằng việc tiến hành đặt mua, bạn đã đồng ý với{" "}
                <a href="#" className={styles.termsLink}>Điều Kiện Giao Dịch Chung</a>
              </p>
              {payError && (
                <p role="alert" className={styles.terms} style={{ color: "#ef4444" }}>
                  {payError}
                </p>
              )}
              <button
                type="button"
                className={styles.payBtn}
                disabled={expired || paying}
                onClick={pay}
              >
                {expired
                  ? "Hết thời gian giữ vé"
                  : paying
                    ? "Đang xử lý…"
                    : isFree
                      ? "Đặt vé miễn phí"
                      : "Thanh toán"}
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
