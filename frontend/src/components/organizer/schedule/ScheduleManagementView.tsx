"use client"

import { useEffect, useState } from "react"
import { Save, PlusCircle, Trash2, AlertTriangle, CheckCircle2, Ticket, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ServerEventShow } from "../organizer-event-detail-api"
import { updateEventShows, type ScheduleShowInput } from "./organizer-schedule-api"
import tableStyles from "../checkin/checkin.module.css"
import styles from "./schedule.module.css"

/** ISO (UTC) → "YYYY-MM-DDTHH:mm" in the browser's local time, for datetime-local. */
function isoToLocalInput(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** One editable row of the show table. */
interface ShowRow {
  /** Server _id for saved shows; FE-generated key for new rows. */
  key: string
  serverId?: string
  title: string
  start: string
  end: string
}

let rowSeq = 0
function newRow(): ShowRow {
  rowSeq += 1
  return { key: `new-${rowSeq}`, title: "", start: "", end: "" }
}

function toRows(shows: ServerEventShow[]): ShowRow[] {
  return shows
    .filter((s) => s._id)
    .map((s) => ({
      key: s._id as string,
      serverId: s._id,
      title: s.title ?? "",
      start: isoToLocalInput(s.startTime),
      end: isoToLocalInput(s.endTime),
    }))
}

interface ScheduleManagementViewProps {
  eventId: string
  /** Saved shows from the workspace detail. */
  shows: ServerEventShow[]
  /** Ticket-tier count per show id — a show with tiers can't be deleted. */
  ticketCounts: Record<string, number>
  /** Backend review state — schedule is editable only while DRAFT/REJECTED. */
  reviewStatus?: string
  /** Called after a successful save so the shared workspace context (read by
   *  sibling tabs like "Chỉnh sửa" and the "Đổi suất diễn" switcher)
   *  refetches instead of serving what it loaded on its own first mount. */
  onSaved?: () => void
}

/**
 * "Lịch trình" screen: the event's shows (suất diễn) — add, rename, re-time
 * or remove showings. Ticket tiers are attached to a show on the "Chỉnh sửa"
 * tab; a show that still has tiers must be emptied there before it can be
 * removed here (the backend enforces the same rule).
 */
export function ScheduleManagementView({
  eventId,
  shows,
  ticketCounts,
  reviewStatus,
  onSaved,
}: ScheduleManagementViewProps) {
  const [rows, setRows] = useState<ShowRow[]>(() => {
    const initial = toRows(shows)
    return initial.length > 0 ? initial : [newRow()]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Keep the table in sync when the workspace event reloads (e.g. after a
  // save on the "Chỉnh sửa" tab changed the schedule too).
  useEffect(() => {
    const next = toRows(shows)
    setRows(next.length > 0 ? next : [newRow()])
  }, [shows])

  const editable = reviewStatus === "DRAFT" || reviewStatus === "REJECTED"

  const patchRow = (key: string, patch: Partial<ShowRow>) => {
    setSuccess(null)
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  const removeRow = (key: string) => {
    setSuccess(null)
    setRows((prev) => prev.filter((r) => r.key !== key))
  }

  /** Mirror the backend rules for a friendly message before the request goes out. */
  function validate(): string | null {
    if (rows.length === 0) return "Sự kiện cần ít nhất 1 suất diễn."
    for (let i = 0; i < rows.length; i += 1) {
      const r = rows[i]
      const label = r.title.trim() || `Suất ${i + 1}`
      if (!r.start || !r.end) return `${label}: vui lòng nhập đủ thời gian bắt đầu và kết thúc.`
      const s = new Date(r.start).getTime()
      const e = new Date(r.end).getTime()
      if (Number.isNaN(s) || Number.isNaN(e)) return `${label}: thời gian không hợp lệ.`
      if (e <= s) return `${label}: thời gian kết thúc phải sau thời gian bắt đầu.`
      if (s <= Date.now()) return `${label}: thời gian bắt đầu phải ở tương lai.`
    }
    return null
  }

  const save = async () => {
    setError(null)
    setSuccess(null)
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    setSaving(true)
    try {
      const payload: ScheduleShowInput[] = rows.map((r) => ({
        _id: r.serverId,
        title: r.title.trim() || undefined,
        startTime: new Date(r.start).toISOString(),
        endTime: new Date(r.end).toISOString(),
      }))
      const saved = await updateEventShows(eventId, payload)
      setRows(saved.length > 0 ? toRows(saved) : [newRow()])
      setSuccess("Đã lưu lịch trình suất diễn.")
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lưu lịch trình thất bại")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className={tableStyles.pageHeading}>Lịch trình suất diễn</h1>
      <p className={styles.intro}>
        Một sự kiện có thể gồm nhiều suất diễn, mỗi suất có thời gian riêng và các loại vé
        riêng. Loại vé được gắn vào từng suất ở tab &quot;Chỉnh sửa&quot;.
      </p>

      {!editable && (
        <div className={cn(styles.notice, styles.noticeWarn)} role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            Lịch trình chỉ chỉnh sửa được khi sự kiện ở trạng thái <b>Nháp</b> hoặc <b>Bị từ chối</b>.
            {reviewStatus ? ` Hiện tại: ${reviewStatus}.` : ""}
          </span>
        </div>
      )}

      <div className={styles.showList}>
        {rows.map((row, i) => {
          const tierCount = row.serverId ? ticketCounts[row.serverId] ?? 0 : 0
          return (
            <div key={row.key} className={styles.showRow}>
              <div className={styles.rowHead}>
                <input
                  type="text"
                  className={cn(styles.input, styles.titleInput)}
                  value={row.title}
                  maxLength={100}
                  placeholder={`Suất ${i + 1}`}
                  disabled={!editable}
                  aria-label="Tên suất diễn"
                  onChange={(e) => patchRow(row.key, { title: e.target.value })}
                />
                <span className={cn(styles.badge, row.serverId ? styles.badgeSaved : styles.badgeNew)}>
                  {row.serverId ? "Đã lưu" : "Mới"}
                </span>
                <span className={styles.ticketCount} title="Số loại vé thuộc suất này">
                  <Ticket size={14} aria-hidden="true" /> {tierCount} loại vé
                </span>
                {editable && (
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => removeRow(row.key)}
                    disabled={tierCount > 0}
                    title={
                      tierCount > 0
                        ? "Suất này còn loại vé — xoá/chuyển vé ở tab Chỉnh sửa trước"
                        : "Xóa suất diễn"
                    }
                    aria-label="Xóa suất diễn"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className={styles.dateFields}>
                <div>
                  <label className={styles.fieldLabel} htmlFor={`show-start-${row.key}`}>
                    Thời gian bắt đầu
                  </label>
                  <input
                    id={`show-start-${row.key}`}
                    type="datetime-local"
                    className={styles.input}
                    value={row.start}
                    disabled={!editable}
                    onChange={(e) => patchRow(row.key, { start: e.target.value })}
                  />
                </div>
                <div>
                  <label className={styles.fieldLabel} htmlFor={`show-end-${row.key}`}>
                    Thời gian kết thúc
                  </label>
                  <input
                    id={`show-end-${row.key}`}
                    type="datetime-local"
                    className={styles.input}
                    value={row.end}
                    min={row.start || undefined}
                    disabled={!editable}
                    onChange={(e) => patchRow(row.key, { end: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {editable && (
        <p className={styles.hint}>
          <Info size={14} aria-hidden="true" />
          Xoá một suất đã có loại vé: sang tab &quot;Chỉnh sửa&quot; xoá hoặc chuyển các vé của suất đó trước.
        </p>
      )}

      {error && (
        <p role="alert" className={cn(styles.notice, styles.noticeError)}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {success && (
        <p role="status" className={cn(styles.notice, styles.noticeOk)}>
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}

      {editable && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              setSuccess(null)
              setRows((prev) => [...prev, newRow()])
            }}
            disabled={saving}
          >
            <PlusCircle size={16} aria-hidden="true" /> Thêm suất diễn
          </button>
          <button type="button" className={styles.primaryBtn} onClick={save} disabled={saving}>
            <Save size={16} aria-hidden="true" /> {saving ? "Đang lưu…" : "Lưu lịch trình"}
          </button>
        </div>
      )}
    </div>
  )
}
