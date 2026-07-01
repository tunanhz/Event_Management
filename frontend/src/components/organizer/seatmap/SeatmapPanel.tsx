"use client"

import { Ticket, Armchair, Sofa, Lock, LockOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatInt, type TicketType } from "../my-events-data"
import styles from "./seatmap.module.css"

export type SeatmapTab = "overview" | "lock" | "invite"

interface SeatmapPanelProps {
  types: TicketType[]
  selectedTotal: number
  tab: SeatmapTab
  onTabChange: (tab: SeatmapTab) => void
  onClear: () => void
}

const TABS: { key: SeatmapTab; label: string }[] = [
  { key: "overview", label: "Tổng quan" },
  { key: "lock", label: "Khoá ghế" },
  { key: "invite", label: "Đặt vé mời" },
]

/** Right-hand tabbed panel: ticket overview / seat locking / invite tickets. */
export function SeatmapPanel({
  types,
  selectedTotal,
  tab,
  onTabChange,
  onClear,
}: SeatmapPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist" aria-label="Công cụ sơ đồ ghế">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={cn(styles.tab, tab === t.key && styles.tabActive)}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className={styles.panelBody}>
          <div className={styles.overviewHead}>
            <span>Loại vé</span>
          </div>
          {types.map((t) => (
            <div key={t.name} className={styles.overviewRow}>
              <span className={styles.overviewName}>{t.name}</span>
              <span className={styles.overviewPrice}>{formatInt(t.price)} đ</span>
            </div>
          ))}
        </div>
      )}

      {tab === "lock" && (
        <>
          <div className={styles.panelBody}>
            <div className={styles.listHead}>
              <Ticket size={18} aria-hidden="true" />
              Danh sách ghế đã chọn ({selectedTotal})
            </div>
            <div className={styles.emptyState}>
              <Sofa size={64} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>Sự kiện này không có sơ đồ ghế ngồi</p>
            </div>
            <div className={styles.panelActions}>
              <button type="button" className={styles.ghostBtn} onClick={onClear}>
                Bỏ chọn
              </button>
              <button type="button" className={styles.ghostBtn}>
                Chọn cả hàng
              </button>
            </div>
          </div>
          <div className={styles.panelFooter}>
            <button
              type="button"
              className={styles.unlockBtn}
              disabled={selectedTotal === 0}
            >
              <LockOpen size={16} aria-hidden="true" />
              Mở khoá
            </button>
            <button
              type="button"
              className={styles.lockBtn}
              disabled={selectedTotal === 0}
            >
              <Lock size={16} aria-hidden="true" />
              Khoá ghế
            </button>
          </div>
        </>
      )}

      {tab === "invite" && (
        <>
          <div className={styles.panelBody}>
            <div className={styles.listHead}>
              <Armchair size={18} aria-hidden="true" />
              Tổng số vé ({selectedTotal})
            </div>
            <div className={styles.emptyState}>
              <Sofa size={64} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyText}>Bạn chưa chọn ghế nào!</p>
            </div>
            <div className={styles.panelActions}>
              <button type="button" className={styles.ghostBtn} onClick={onClear}>
                Bỏ chọn
              </button>
              <button type="button" className={styles.ghostBtn}>
                Chọn cả hàng
              </button>
            </div>
          </div>
          <div className={styles.panelFooter}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={selectedTotal === 0}
            >
              Đặt vé mời
            </button>
          </div>
        </>
      )}
    </div>
  )
}
