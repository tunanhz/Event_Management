"use client"

import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import {
  Inbox,
  FilePlus2,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Trash2,
} from "lucide-react"
import { useOrganizerTitle } from "@/components/organizer/OrganizerShellContext"
import { ConfirmDialog } from "@/components/organizer/ConfirmDialog"
import { cn, formatVnd, formatDateTime } from "@/lib/utils"
import { fetchMyEvents } from "@/components/organizer/organizer-my-events-api"
import type { OrganizerEvent } from "@/components/organizer/my-events-data"
import {
  fetchMyReports,
  generateReport,
  deleteReport,
  bulkDeleteReports,
  downloadReport,
  reportCreatorName,
  reportEventTitle,
  type RevenueReportApi,
  type PaginationMeta,
} from "@/components/organizer/organizer-reports-api"
import styles from "./reports.module.css"

const COLUMNS = ["Báo cáo", "Sự kiện", "Khoảng thời gian", "Doanh thu", "Ngày tạo", "Người tạo", "Thao tác"]

/** Report management ("Quản lý báo cáo") — generate, view breakdown, export
 *  (xlsx/pdf) and delete real RevenueReport documents. */
export default function OrganizerReportsPage() {
  useOrganizerTitle("Quản lý báo cáo")

  const [reports, setReports] = useState<RevenueReportApi[] | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  })
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState<OrganizerEvent[]>([])
  const [eventId, setEventId] = useState("")
  const [reportName, setReportName] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [justCreated, setJustCreated] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RevenueReportApi | null>(null)
  // Selection persists across page changes (Set, not tied to the current
  // page's rows) so an organizer can tick items across several pages before
  // deleting them all in one go.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const loadReports = useCallback((targetPage: number) => {
    return fetchMyReports(targetPage)
      .then(({ data, pagination: meta }) => {
        setReports(data)
        setPagination(meta)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách báo cáo"))
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([fetchMyReports(1), fetchMyEvents()])
      .then(([reportsRes, evs]) => {
        if (!active) return
        setReports(reportsRes.data)
        setPagination(reportsRes.pagination)
        setEvents(evs)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Không tải được dữ liệu")
      })
    return () => {
      active = false
    }
  }, [])

  const goToPage = (p: number) => {
    setPage(p)
    loadReports(p)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setJustCreated(false)
    if (!eventId) {
      setError("Vui lòng chọn sự kiện để tạo báo cáo.")
      return
    }
    setError("")
    setCreating(true)
    try {
      await generateReport({
        eventId,
        reportName: reportName.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      })
      setReportName("")
      setJustCreated(true)
      // New reports sort first (newest generatedAt) — jump to page 1 to see it.
      setPage(1)
      await loadReports(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo báo cáo thất bại")
    } finally {
      setCreating(false)
    }
  }

  const confirmDelete = async () => {
    const report = pendingDelete
    if (!report) return
    setError("")
    setDeletingId(report._id)
    try {
      await deleteReport(report._id)
      if (expandedId === report._id) setExpandedId(null)
      setPendingDelete(null)
      setSelectedIds((prev) => {
        if (!prev.has(report._id)) return prev
        const next = new Set(prev)
        next.delete(report._id)
        return next
      })
      // Deleted the last row on a page past the first? Step back a page
      // instead of leaving the view stranded on a now-empty page.
      const remainingOnPage = (reports?.length ?? 1) - 1
      const targetPage = remainingOnPage === 0 && page > 1 ? page - 1 : page
      setPage(targetPage)
      await loadReports(targetPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá báo cáo thất bại")
    } finally {
      setDeletingId(null)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pageIds = (reports ?? []).map((r) => r._id)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
  const someOnPageSelected = pageIds.some((id) => selectedIds.has(id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someOnPageSelected && !allOnPageSelected
    }
  }, [someOnPageSelected, allOnPageSelected])

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id))
      } else {
        pageIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const confirmBulkDelete = async () => {
    setError("")
    setBulkDeleting(true)
    try {
      const deletedCount = await bulkDeleteReports([...selectedIds])
      if (expandedId && selectedIds.has(expandedId)) setExpandedId(null)
      setSelectedIds(new Set())
      setBulkConfirmOpen(false)
      // Land on a page that still exists once the deleted rows are gone.
      const remainingTotal = Math.max(0, pagination.totalItems - deletedCount)
      const newTotalPages = Math.max(1, Math.ceil(remainingTotal / pagination.itemsPerPage))
      const targetPage = Math.min(page, newTotalPages)
      setPage(targetPage)
      await loadReports(targetPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá các báo cáo đã chọn thất bại")
    } finally {
      setBulkDeleting(false)
    }
  }

  const rangeText = (r: RevenueReportApi) => {
    const f = r.fromDate ? formatDateTime(r.fromDate) : "Từ đầu"
    const t = r.toDate ? formatDateTime(r.toDate) : "đến nay"
    return `${f} → ${t}`
  }

  return (
    <div className={styles.wrap}>
      {/* ── Generate form ─────────────────────────────────────────── */}
      <form className={styles.formCard} onSubmit={handleCreate} noValidate>
        <div className={styles.formRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rp-event">Sự kiện *</label>
            <select
              id="rp-event"
              className={styles.input}
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            >
              <option value="">— Chọn sự kiện —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rp-name">Tên báo cáo</label>
            <input
              id="rp-name"
              className={styles.input}
              type="text"
              maxLength={200}
              placeholder="Bỏ trống để đặt tên tự động"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rp-from">Từ ngày</label>
            <input
              id="rp-from"
              className={styles.input}
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="rp-to">Đến ngày</label>
            <input
              id="rp-to"
              className={styles.input}
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.createBtn} disabled={creating}>
            <FilePlus2 size={16} aria-hidden="true" />
            {creating ? "Đang tạo…" : "Tạo báo cáo"}
          </button>
        </div>
        {error && (
          <p role="alert" className={styles.formError}>{error}</p>
        )}
        {justCreated && (
          <p role="status" className={styles.formSuccess}>
            <CheckCircle2 size={15} aria-hidden="true" /> Đã tạo báo cáo — doanh thu được tính từ
            các đơn đã thanh toán.
          </p>
        )}
      </form>

      {/* ── Report list ───────────────────────────────────────────── */}
      <div className={styles.card}>
        {selectedIds.size > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>Đã chọn {selectedIds.size} báo cáo</span>
            <button
              type="button"
              className={styles.bulkClearBtn}
              onClick={() => setSelectedIds(new Set())}
            >
              Bỏ chọn
            </button>
            <button
              type="button"
              className={styles.bulkDeleteBtn}
              onClick={() => setBulkConfirmOpen(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
              Xoá đã chọn ({selectedIds.size})
            </button>
          </div>
        )}
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.checkCol}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className={styles.check}
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    disabled={pageIds.length === 0}
                    aria-label="Chọn tất cả báo cáo ở trang này"
                  />
                </th>
                {COLUMNS.map((col) => (
                  <th key={col} scope="col">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports === null ? (
                <tr>
                  <td className={styles.emptyCell} colSpan={COLUMNS.length + 1}>
                    <div className={styles.empty}>
                      <Loader2
                        size={36}
                        className={styles.emptyIcon}
                        aria-hidden="true"
                        style={{ animation: "spin 0.8s linear infinite" }}
                      />
                      <p className={styles.emptyText}>Đang tải báo cáo…</p>
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td className={styles.emptyCell} colSpan={COLUMNS.length + 1}>
                    <div className={styles.empty}>
                      <Inbox size={56} className={styles.emptyIcon} aria-hidden="true" />
                      <p className={styles.emptyText}>
                        Chưa có báo cáo nào — chọn sự kiện phía trên để tạo báo cáo doanh thu.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((r) => {
                  const isExpanded = expandedId === r._id
                  return (
                    <Fragment key={r._id}>
                      <tr className={selectedIds.has(r._id) ? styles.rowSelected : undefined}>
                        <td className={styles.checkCol}>
                          <input
                            type="checkbox"
                            className={styles.check}
                            checked={selectedIds.has(r._id)}
                            onChange={() => toggleSelect(r._id)}
                            aria-label={`Chọn báo cáo ${r.reportName}`}
                          />
                        </td>
                        <td className={styles.nameCell}>{r.reportName}</td>
                        <td>{reportEventTitle(r)}</td>
                        <td>{rangeText(r)}</td>
                        <td className={styles.revenueCell}>{formatVnd(r.totalRevenue)}</td>
                        <td>{formatDateTime(r.generatedAt)}</td>
                        <td>{reportCreatorName(r)}</td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label={isExpanded ? "Ẩn chi tiết" : "Xem chi tiết theo loại vé"}
                              aria-expanded={isExpanded}
                              title="Xem chi tiết theo loại vé"
                              onClick={() => setExpandedId(isExpanded ? null : r._id)}
                            >
                              {isExpanded ? (
                                <ChevronUp size={16} aria-hidden="true" />
                              ) : (
                                <ChevronDown size={16} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Xuất Excel"
                              title="Xuất Excel (.xlsx)"
                              onClick={() => downloadReport(r._id, "xlsx")}
                            >
                              <FileSpreadsheet size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtn}
                              aria-label="Xuất PDF"
                              title="Xuất PDF"
                              onClick={() => downloadReport(r._id, "pdf")}
                            >
                              <FileText size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.iconBtnDanger}
                              aria-label="Xoá báo cáo"
                              title="Xoá báo cáo"
                              disabled={deletingId === r._id}
                              onClick={() => setPendingDelete(r)}
                            >
                              {deletingId === r._id ? (
                                <Loader2
                                  size={16}
                                  aria-hidden="true"
                                  style={{ animation: "spin 0.8s linear infinite" }}
                                />
                              ) : (
                                <Trash2 size={16} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r._id}-detail`}>
                          <td colSpan={COLUMNS.length + 1} className={styles.detailCell}>
                            {/* Reports generated before ticketBreakdown existed on the
                                schema may still come back without it. */}
                            {(r.ticketBreakdown ?? []).length === 0 ? (
                              <p className={styles.detailEmpty}>
                                Báo cáo này chưa có dữ liệu chi tiết theo loại vé.
                              </p>
                            ) : (
                              <table className={styles.detailTable}>
                                <thead>
                                  <tr>
                                    <th scope="col">Loại vé</th>
                                    <th scope="col">Giá vé</th>
                                    <th scope="col">Đã bán</th>
                                    <th scope="col">Doanh thu</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(r.ticketBreakdown ?? []).map((t) => (
                                    <tr key={t.ticketId}>
                                      <td>{t.ticketName}</td>
                                      <td>{formatVnd(t.price)}</td>
                                      <td>{t.sold}</td>
                                      <td>{formatVnd(t.revenue)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <nav className={styles.pager} aria-label="Phân trang báo cáo">
          <button
            type="button"
            className={styles.pageNav}
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            aria-label="Trang trước"
          >
            <ChevronLeft size={18} />
          </button>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={cn(styles.pageBtn, p === page && styles.pageBtnActive)}
              aria-current={p === page ? "page" : undefined}
              onClick={() => goToPage(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={styles.pageNav}
            onClick={() => goToPage(page + 1)}
            disabled={page === pagination.totalPages}
            aria-label="Trang sau"
          >
            <ChevronRight size={18} />
          </button>
          <span className={styles.pagerSummary}>{pagination.totalItems} báo cáo</span>
        </nav>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Xoá báo cáo"
          message={`Xoá báo cáo "${pendingDelete.reportName}"? Không thể hoàn tác.`}
          confirmLabel="Xoá báo cáo"
          danger
          loading={deletingId === pendingDelete._id}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {bulkConfirmOpen && (
        <ConfirmDialog
          title="Xoá các báo cáo đã chọn"
          message={`Xoá ${selectedIds.size} báo cáo đã chọn? Không thể hoàn tác.`}
          confirmLabel={`Xoá ${selectedIds.size} báo cáo`}
          danger
          loading={bulkDeleting}
          onConfirm={confirmBulkDelete}
          onCancel={() => setBulkConfirmOpen(false)}
        />
      )}
    </div>
  )
}
