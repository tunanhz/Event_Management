"use client"

import { useEffect, useState } from "react"
import {
  CalendarClock,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import {
  cancelAdminEvent,
  deleteAdminEvent,
  fetchAdminEvents,
  refLabel,
  type AdminEvent,
  type LifecycleStatus,
  type PaginationMeta,
  type ReviewStatus,
} from "@/lib/admin-event-api"

const REVIEW_OPTIONS: { value: ReviewStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả xét duyệt" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PENDING_REVIEW", label: "Chờ duyệt" },
  { value: "APPROVED_WAITING_DEPOSIT", label: "Chờ cọc" },
  { value: "PUBLISHED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
]

const STATUS_OPTIONS: { value: LifecycleStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả vòng đời" },
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Công khai" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "completed", label: "Hoàn tất" },
]

const REVIEW_LABEL: Record<ReviewStatus, string> = {
  DRAFT: "Bản nháp",
  PENDING_REVIEW: "Chờ duyệt",
  APPROVED_WAITING_DEPOSIT: "Chờ cọc",
  PUBLISHED: "Đã duyệt",
  REJECTED: "Từ chối",
}

const STATUS_LABEL: Record<LifecycleStatus, string> = {
  draft: "Nháp",
  published: "Công khai",
  cancelled: "Đã hủy",
  completed: "Hoàn tất",
}

const emptyMeta: PaginationMeta = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function reviewBadge(reviewStatus: ReviewStatus): "secondary" | "success" | "warning" | "destructive" {
  if (reviewStatus === "PUBLISHED") return "success"
  if (reviewStatus === "PENDING_REVIEW" || reviewStatus === "APPROVED_WAITING_DEPOSIT") return "warning"
  if (reviewStatus === "REJECTED") return "destructive"
  return "secondary"
}

function lifecycleClass(status: LifecycleStatus) {
  if (status === "published") return "text-emerald-600"
  if (status === "cancelled") return "text-rose-600"
  if (status === "completed") return "text-cyan-600"
  return "text-muted-foreground"
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [status, setStatus] = useState<LifecycleStatus | "">("")
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (nextPage = page) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAdminEvents({
        page: nextPage,
        limit: 10,
        search: submittedSearch,
        status,
        reviewStatus,
      })
      setEvents(result.events)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách sự kiện")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchAdminEvents({ page, limit: 10, search: submittedSearch, status, reviewStatus })
      .then((eventResult) => {
        if (cancelled) return
        setEvents(eventResult.events)
        setMeta(eventResult.meta)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được danh sách sự kiện")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, submittedSearch, status, reviewStatus])

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmittedSearch(search.trim())
    setPage(1)
  }

  const cancelEvent = async (event: AdminEvent) => {
    const reason = window.prompt(`Lý do hủy "${event.title}"?`, "Admin hủy sự kiện")
    if (reason === null) return
    setSaving(true)
    setError(null)
    try {
      await cancelAdminEvent(event._id, reason)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hủy sự kiện thất bại")
    } finally {
      setSaving(false)
    }
  }

  const removeEvent = async (event: AdminEvent) => {
    const confirmed = window.confirm(
      `Xóa cứng "${event.title}"? Toàn bộ vé, đăng ký và thanh toán liên quan sẽ bị xóa.`
    )
    if (!confirmed) return
    setSaving(true)
    setError(null)
    try {
      await deleteAdminEvent(event._id, true)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa sự kiện thất bại")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground outline-none transition-all focus:border-cyan-500 focus:bg-card focus:ring-2 focus:ring-cyan-500/20"

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quản trị sự kiện</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Xem toàn bộ sự kiện, theo dõi trạng thái, hủy hoặc xóa khi cần.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
          <Button asChild>
            <Link href="/dashboard/moderation">
              <Eye className="mr-2 h-4 w-4" />
              Kiểm duyệt
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_180px_200px]">
            <form onSubmit={submitSearch} className="flex gap-2" role="search">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm tên sự kiện"
                  className="h-11 w-full rounded-xl border border-border bg-muted pl-9 pr-3 text-sm text-foreground outline-none transition-all focus:border-cyan-500 focus:bg-card focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <Button type="submit">Tìm</Button>
            </form>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as LifecycleStatus | "")
                setPage(1)
              }}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={reviewStatus}
              onChange={(event) => {
                setReviewStatus(event.target.value as ReviewStatus | "")
                setPage(1)
              }}
              className={inputClass}
            >
              {REVIEW_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-70" />
            <p className="text-sm">Đang tải danh sách sự kiện...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Sự kiện</th>
                  <th className="px-4 py-3 font-bold">Organizer</th>
                  <th className="px-4 py-3 font-bold">Lịch</th>
                  <th className="px-4 py-3 font-bold">Vòng đời</th>
                  <th className="px-4 py-3 font-bold">Xét duyệt</th>
                  <th className="px-4 py-3 font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event._id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-foreground">{event.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{refLabel(event.categoryId, "name") || event.category || "Chưa phân loại"}</div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <div>{event.organizer || refLabel(event.creatorId, "fullName") || "—"}</div>
                      <div className="mt-1 text-xs">{refLabel(event.creatorId, "email")}</div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-4 w-4" />
                        {formatDate(event.startDate ?? event.date)}
                      </div>
                      <div className="mt-1 text-xs">Sức chứa: {event.capacity ?? event.maxAttendees ?? "—"}</div>
                    </td>
                    <td className={cn("px-4 py-4 font-semibold", lifecycleClass(event.status))}>
                      {STATUS_LABEL[event.status]}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={reviewBadge(event.reviewStatus)}>
                        {REVIEW_LABEL[event.reviewStatus]}
                      </Badge>
                      {event.rejectionReason && (
                        <p className="mt-1 max-w-56 text-xs text-rose-600 dark:text-rose-400">{event.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/dashboard/moderation/${event._id}`}>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Chi tiết
                          </Link>
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => void cancelEvent(event)}>
                          <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                          Hủy
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => void removeEvent(event)}>
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Tổng {meta.totalItems.toLocaleString("vi-VN")} sự kiện
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Trước
            </Button>
            <span>
              Trang {meta.currentPage}/{Math.max(1, meta.totalPages)}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Sau
            </Button>
          </div>
        </div>
      </div>

    </div>
  )
}
