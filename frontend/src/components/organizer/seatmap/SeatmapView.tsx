"use client"

import { useMemo, useState } from "react"
import {
  formatInt,
  type OrganizerEvent,
  type TicketType,
} from "../my-events-data"
import { EventShowHeader } from "../shared/EventShowHeader"
import { SeatmapPanel, type SeatmapTab } from "./SeatmapPanel"
import styles from "./seatmap.module.css"

/** Available (empty) tickets for a type = total − sold − locked. */
const availableOf = (t: TicketType) =>
  Math.max(0, t.total - t.sold - t.locked)

/** Seat map ("Sơ đồ ghế"): pick ticket quantities to lock or invite. */
export function SeatmapView({ event }: { event: OrganizerEvent }) {
  const types = event.ticketTypes ?? []
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [tab, setTab] = useState<SeatmapTab>("overview")

  const selectedTotal = useMemo(
    () => Object.values(quantities).reduce((a, n) => a + n, 0),
    [quantities]
  )

  const setQty = (name: string, next: number, max: number) =>
    setQuantities((prev) => ({
      ...prev,
      [name]: Math.min(max, Math.max(0, next)),
    }))

  const clear = () => setQuantities({})

  return (
    <>
      <EventShowHeader dateText={event.dateTime} />

      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.leftHead}>
            <span className={styles.leftHeadLabel}>Loại vé</span>
            <span className={styles.leftHeadLabel}>Số lượng</span>
          </div>

          {types.map((t) => {
            const available = availableOf(t)
            const qty = quantities[t.name] ?? 0
            return (
              <div key={t.name} className={styles.ticketRow}>
                <div className={styles.ticketInfo}>
                  <span className={styles.ticketName}>{t.name}</span>
                  <span className={styles.ticketEmpty}>
                    Đang trống: {formatInt(available)} vé
                  </span>
                </div>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    onClick={() => setQty(t.name, qty - 1, available)}
                    disabled={qty <= 0}
                    aria-label={`Giảm số lượng ${t.name}`}
                  >
                    −
                  </button>
                  <span className={styles.stepValue}>{qty}</span>
                  <button
                    type="button"
                    className={styles.stepBtnPlus}
                    onClick={() => setQty(t.name, qty + 1, available)}
                    disabled={qty >= available}
                    aria-label={`Tăng số lượng ${t.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <SeatmapPanel
          types={types}
          selectedTotal={selectedTotal}
          tab={tab}
          onTabChange={setTab}
          onClear={clear}
        />
      </div>
    </>
  )
}
