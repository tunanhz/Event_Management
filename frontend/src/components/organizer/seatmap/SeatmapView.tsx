"use client"

import { useMemo, useState } from "react"
import {
  formatInt,
  type OrganizerEvent,
  type TicketType,
} from "../my-events-data"
import { useWorkspaceEvent } from "../EventWorkspaceContext"
import { EventShowHeader } from "../shared/EventShowHeader"
import { SeatmapPanel, type SeatmapTab } from "./SeatmapPanel"
import styles from "./seatmap.module.css"

/** Available (empty) tickets for a type = total − sold − locked. */
const availableOf = (t: TicketType) =>
  Math.max(0, t.total - t.sold - t.locked)

/** Seat map ("Sơ đồ ghế"): pick ticket quantities to lock or invite. */
export function SeatmapView({ event }: { event: OrganizerEvent }) {
  const { selectedShowId } = useWorkspaceEvent()
  // Scope the ticket list to the show picked in the shared "Đổi suất diễn"
  // switcher (null = all shows) — the same per-show scoping the other report
  // tabs already do, so switching shows here actually changes the list.
  const types = useMemo(() => {
    const all = event.ticketTypes ?? []
    return selectedShowId ? all.filter((t) => t.showId === selectedShowId) : all
  }, [event.ticketTypes, selectedShowId])

  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [tab, setTab] = useState<SeatmapTab>("overview")

  // Count only the visible show's selections, so a tally from another suất
  // diễn can't leak in after switching shows.
  const selectedTotal = useMemo(
    () => types.reduce((sum, t, i) => sum + (quantities[t.id ?? String(i)] ?? 0), 0),
    [types, quantities]
  )

  const setQty = (key: string, next: number, max: number) =>
    setQuantities((prev) => ({
      ...prev,
      [key]: Math.min(max, Math.max(0, next)),
    }))

  const clear = () => setQuantities({})

  return (
    <>
      <EventShowHeader />

      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.leftHead}>
            <span className={styles.leftHeadLabel}>Loại vé</span>
            <span className={styles.leftHeadLabel}>Số lượng</span>
          </div>

          {types.map((t, i) => {
            const key = t.id ?? String(i)
            const available = availableOf(t)
            const qty = quantities[key] ?? 0
            return (
              <div key={key} className={styles.ticketRow}>
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
                    onClick={() => setQty(key, qty - 1, available)}
                    disabled={qty <= 0}
                    aria-label={`Giảm số lượng ${t.name}`}
                  >
                    −
                  </button>
                  <span className={styles.stepValue}>{qty}</span>
                  <button
                    type="button"
                    className={styles.stepBtnPlus}
                    onClick={() => setQty(key, qty + 1, available)}
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
