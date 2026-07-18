/**
 * Revenue reports ("Quản lý báo cáo") API layer — real RevenueReport docs:
 *   GET    /organizer/reports              — my generated reports, paginated (event + creator joined)
 *   POST   /organizer/reports               — generate one (totals computed server-side)
 *   DELETE /organizer/reports/:id           — remove one
 *   GET    /organizer/reports/:id/export    — download as xlsx/pdf (triggered via <a download>)
 */
import { clientApi } from "@/lib/client-api"

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

export interface RevenueReportTicketRow {
  ticketId: string
  ticketName: string
  price: number
  sold: number
  revenue: number
}

export interface RevenueReportApi {
  _id: string
  reportName: string
  reportType: string
  fromDate?: string
  toDate?: string
  totalRevenue: number
  /** Per-ticket-type breakdown, frozen at generation time. Empty for
   *  reports generated before this field existed. */
  ticketBreakdown: RevenueReportTicketRow[]
  fileUrl?: string
  generatedAt: string
  /** Populated refs (title / fullName) — plain ids if population is skipped. */
  eventId: { _id: string; title?: string } | string
  generatedBy: { _id: string; fullName?: string } | string
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
  meta?: PaginationMeta
}

const FALLBACK_META: PaginationMeta = { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 }

export async function fetchMyReports(
  page = 1,
  limit = 10
): Promise<{ data: RevenueReportApi[]; pagination: PaginationMeta }> {
  const res = await clientApi.get<Envelope<RevenueReportApi[]>>(
    `/organizer/reports?page=${page}&limit=${limit}`
  )
  return { data: res.data ?? [], pagination: res.meta ?? FALLBACK_META }
}

export interface GenerateReportBody {
  eventId: string
  reportName?: string
  fromDate?: string
  toDate?: string
}

export async function generateReport(body: GenerateReportBody): Promise<RevenueReportApi> {
  const res = await clientApi.post<Envelope<RevenueReportApi>>("/organizer/reports", body)
  return res.data
}

export async function deleteReport(id: string): Promise<void> {
  await clientApi.delete(`/organizer/reports/${id}`)
}

/** Bulk delete — one request instead of N. Returns how many were actually removed. */
export async function bulkDeleteReports(ids: string[]): Promise<number> {
  const res = await clientApi.post<Envelope<{ deletedCount: number }>>(
    "/organizer/reports/bulk-delete",
    { ids }
  )
  return res.data.deletedCount
}

export type ReportExportFormat = "xlsx" | "pdf"

/** Relative URL for downloading one report — used as an <a href download>. */
export function reportExportUrl(id: string, format: ReportExportFormat): string {
  return `/api/organizer/reports/${id}/export?format=${format}`
}

/**
 * Trigger a browser download for the export endpoint. A plain `<a href>`
 * click (not fetch+blob) is enough here: the request is same-origin (via the
 * Next.js /api rewrite) so the httpOnly auth cookie rides along automatically,
 * exactly like any other authenticated navigation.
 */
export function downloadReport(id: string, format: ReportExportFormat): void {
  const a = document.createElement("a")
  a.href = reportExportUrl(id, format)
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Safe accessors for the populated refs. */
export function reportEventTitle(r: RevenueReportApi): string {
  return typeof r.eventId === "object" && r.eventId?.title ? r.eventId.title : "—"
}
export function reportCreatorName(r: RevenueReportApi): string {
  return typeof r.generatedBy === "object" && r.generatedBy?.fullName
    ? r.generatedBy.fullName
    : "Tôi"
}
