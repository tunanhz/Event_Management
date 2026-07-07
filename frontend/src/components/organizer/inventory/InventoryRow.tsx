"use client"

import { useState } from "react"
import { Loader2, EyeOff, Eye, Check } from "lucide-react"
import type { AdjustInventoryInput, TicketInventoryRow } from "./organizer-inventory-api"
import styles from "./inventory.module.css"

const STATUS: Record<
  TicketInventoryRow["status"],
  { label: string; badge: string; row: string }
> = {
  ACTIVE: { label: "Đang bán", badge: styles.badgeActive, row: styles.rowActive },
  SOLD_OUT: { label: "Hết vé", badge: styles.badgeSold, row: styles.rowSold },
  HIDDEN: { label: "Đang ẩn", badge: styles.badgeHidden, row: styles.rowHidden },
}

const fmt = (n: number) => n.toLocaleString("vi-VN")

/** One ticket tier: live stock stats + restock field + pause/resume toggle. */
export function InventoryRow({
  row,
  busy,
  error,
  readOnly = false,
  onAdjust,
}: {
  row: TicketInventoryRow
  busy: boolean
  error: string | null
  /** Ended event: show stock stats only, no restock/toggle controls. */
  readOnly?: boolean
  onAdjust: (patch: AdjustInventoryInput) => void
}) {
  // Seeded from the current stock. The parent keys this row by `ticketId:quantity`,
  // so a server-side change (refresh / concurrent edit) remounts it with the fresh
  // value — a stale input can't silently revert someone else's restock.
  const [qty, setQty] = useState<number>(row.quantity)

  const dirty = qty !== row.quantity
  // Restock floor: total can't drop below what's already sold/held.
  const tooLow = qty < row.soldQuantity
  const invalid = !Number.isInteger(qty) || qty < 1 || tooLow

  const isActive = row.status === "ACTIVE"
  const soldOut = row.available <= 0
  const meta = STATUS[row.status]

  return (
    <article className={`${styles.row} ${meta.row}`}>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <span className={styles.name} title={row.ticketName}>
            {row.ticketName}
          </span>
          <span className={`${styles.badge} ${meta.badge}`}>
            <span className={styles.dot} aria-hidden="true" />
            {meta.label}
          </span>
          <span className={styles.price}>{fmt(row.price)}đ</span>
        </div>

        <div className={styles.barWrap}>
          <div
            className={styles.bar}
            role="progressbar"
            aria-valuenow={row.soldPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Đã bán ${row.soldPct}%`}
          >
            <span className={styles.barFill} style={{ width: `${Math.min(100, row.soldPct)}%` }} />
          </div>
          <span className={styles.barPct}>{row.soldPct}%</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Đã bán</span>
            <span className={styles.statValue}>{fmt(row.sold)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Đang giữ</span>
            <span className={styles.statValue}>{fmt(row.held)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Còn lại</span>
            <span className={`${styles.statValue} ${soldOut ? styles.valDanger : styles.valAccent}`}>
              {fmt(row.available)}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Tổng kho</span>
            <span className={styles.statValue}>{fmt(row.quantity)}</span>
          </div>
        </div>
      </div>

      {!readOnly && (
      <div className={styles.controls}>
        <div className={styles.restock}>
          <label className={styles.restockLabel} htmlFor={`qty-${row.ticketId}`}>
            Tổng kho vé
          </label>
          <div className={styles.restockRow}>
            <input
              id={`qty-${row.ticketId}`}
              type="number"
              className={styles.qtyInput}
              value={qty}
              min={Math.max(1, row.soldQuantity)}
              step={1}
              disabled={busy}
              onChange={(e) => setQty(Math.floor(Number(e.target.value)))}
            />
            <button
              type="button"
              className={styles.applyBtn}
              disabled={busy || !dirty || invalid}
              onClick={() => onAdjust({ quantity: qty })}
              title={tooLow ? `Tối thiểu ${row.soldQuantity} (đã bán/đang giữ)` : "Cập nhật kho"}
            >
              {busy ? <Loader2 size={15} className={styles.spin} /> : <Check size={15} />}
              Cập nhật
            </button>
          </div>
          {tooLow && (
            <p className={styles.hint}>Tối thiểu {fmt(row.soldQuantity)} vé (đã bán/đang giữ).</p>
          )}
        </div>

        <button
          type="button"
          className={`${styles.toggleBtn} ${isActive ? styles.toggleHide : styles.toggleShow}`}
          disabled={busy}
          onClick={() => onAdjust({ status: isActive ? "HIDDEN" : "ACTIVE" })}
        >
          {isActive ? <EyeOff size={15} /> : <Eye size={15} />}
          {isActive ? "Tạm ẩn" : "Mở lại bán"}
        </button>

        {error && (
          <p className={styles.rowErr} role="alert">
            {error}
          </p>
        )}
      </div>
      )}
    </article>
  )
}
