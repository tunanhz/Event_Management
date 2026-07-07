"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, PackageOpen, RefreshCw, Boxes, Lock } from "lucide-react"
import {
  fetchTicketInventory,
  adjustTicketInventory,
  type AdjustInventoryInput,
  type TicketInventoryRow,
} from "./organizer-inventory-api"
import { InventoryRow } from "./InventoryRow"
import styles from "./inventory.module.css"

/**
 * "Chỉnh sửa" tab for a PUBLISHED event — the only edit still allowed once the
 * event is live and selling: restock a tier or pause/resume its sales. Price,
 * name and schedule are locked (those live in the DRAFT/REJECTED wizard).
 */
export function PublishedInventoryPanel({
  eventId,
  readOnly = false,
}: {
  eventId: string
  /** Event already ended — stock becomes view-only (restock/hide makes no sense). */
  readOnly?: boolean
}) {
  const [rows, setRows] = useState<TicketInventoryRow[] | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  // Refresh/reload failures keep the current table and surface inline, instead
  // of blowing the whole panel away (which would discard still-valid data).
  const [notice, setNotice] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null)

  // Initial load: fetch inline with a mounted guard (setState lands in the async
  // callback, not synchronously in the effect body) — same pattern as the
  // workspace provider.
  useEffect(() => {
    let active = true
    fetchTicketInventory(eventId)
      .then((data) => {
        if (!active) return
        setRows(data)
        setInitError(null)
      })
      .catch((e) => {
        if (active) setInitError(e instanceof Error ? e.message : "Không tải được tồn kho vé")
      })
    return () => {
      active = false
    }
  }, [eventId])

  const retryInitial = async () => {
    setInitError(null)
    try {
      setRows(await fetchTicketInventory(eventId))
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Không tải được tồn kho vé")
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    setNotice(null)
    try {
      setRows(await fetchTicketInventory(eventId))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Làm mới thất bại — vui lòng thử lại")
    } finally {
      setRefreshing(false)
    }
  }

  // Restock / pause-resume, then refetch so held/available/soldPct recompute.
  const onAdjust = async (ticketId: string, patch: AdjustInventoryInput) => {
    setBusyId(ticketId)
    setRowError(null)
    try {
      await adjustTicketInventory(eventId, ticketId, patch)
      setRows(await fetchTicketInventory(eventId))
    } catch (e) {
      setRowError({ id: ticketId, msg: e instanceof Error ? e.message : "Cập nhật thất bại" })
    } finally {
      setBusyId(null)
    }
  }

  if (initError) {
    return (
      <div className={styles.state} role="alert">
        <AlertTriangle size={40} className={styles.stateIconErr} aria-hidden="true" />
        <p>{initError}</p>
        <button type="button" className={styles.refreshBtn} onClick={retryInitial}>
          <RefreshCw size={16} aria-hidden="true" /> Thử lại
        </button>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div className={styles.headInfo}>
          <span className={styles.headIcon} aria-hidden="true">
            <Boxes size={22} />
          </span>
          <div>
            <h2 className={styles.title}>Quản lý kho vé</h2>
            <p className={styles.note}>
              {readOnly ? (
                "Sự kiện đã bắt đầu — kho vé chỉ để xem, không thể điều chỉnh."
              ) : (
                <>
                  Sự kiện đã công bố — chỉ có thể <strong>mở thêm vé</strong> hoặc{" "}
                  <strong>tạm ẩn / mở lại</strong> từng hạng vé. Giá, tên và lịch diễn đã khóa.
                </>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={refresh}
          disabled={refreshing || rows === null}
        >
          <RefreshCw size={16} className={refreshing ? styles.spin : undefined} aria-hidden="true" />
          Làm mới
        </button>
      </header>

      {readOnly && (
        <p className={styles.endedBanner}>
          <Lock size={15} aria-hidden="true" />
          Sự kiện đã bắt đầu nên không thể mở thêm vé hoặc ẩn/hiện hạng vé.
        </p>
      )}

      {notice && (
        <p className={styles.notice} role="alert">
          {notice}
        </p>
      )}

      {rows === null ? (
        <div className={styles.list} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.state}>
          <PackageOpen size={40} aria-hidden="true" />
          <p>Sự kiện chưa có hạng vé nào.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {rows.map((row) => (
            <InventoryRow
              key={`${row.ticketId}:${row.quantity}`}
              row={row}
              busy={busyId === row.ticketId}
              error={rowError?.id === row.ticketId ? rowError.msg : null}
              readOnly={readOnly}
              onAdjust={(patch) => onAdjust(row.ticketId, patch)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
