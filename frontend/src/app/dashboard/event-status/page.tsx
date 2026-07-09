"use client"

import type { ComponentType } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  fetchEventStatusTracking,
  refText,
  type EventStatusItem,
  type ReviewStatus,
} from "@/lib/event-status-api"

const REVIEW_META: Record<
  ReviewStatus,
  { label: string; tone: string; icon: ComponentType<{ className?: string }> }
> = {
  DRAFT: { label: "Bản nháp", tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300", icon: FilePenLine },
  PENDING_REVIEW: { label: "Chờ duyệt", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: Clock3 },
  PUBLISHED: { label: "Đã công khai", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  REJECTED: { label: "Bị từ chối", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: XCircle },
}

const FILTERS = [
  { id: "ALL", label: "Tất cả" },
  { id: "DRAFT", label: "Bản nháp" },
  { id: "PENDING_REVIEW", label: "Chờ duyệt" },
  { id: "PUBLISHED", label: "Đã công khai" },
  { id: "REJECTED", label: "Bị từ chối" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function organizerName(event: EventStatusItem) {
  return event.organizer || refText(event.creatorId, "fullName") || "Chưa có"
}

function categoryName(event: EventStatusItem) {
  return refText(event.categoryId, "name") || "Chưa phân loại"
}

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value.toLocaleString("vi-VN")}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", className)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function EventStatusPage() {
  const [tracking, setTracking] = useState<Awaited<ReturnType<typeof fetchEventStatusTracking>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [filter, setFilter] = useState<FilterId>("ALL")

  const load = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      setTracking(await fetchEventStatusTracking(search))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu theo dõi trạng thái")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchEventStatusTracking("")
      .then((data) => {
        if (!cancelled) setTracking(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được dữ liệu theo dõi trạng thái")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const events = useMemo(() => {
    const list = tracking?.events ?? []
    return filter === "ALL" ? list : list.filter((event) => event.reviewStatus === filter)
  }, [tracking, filter])

  const summary = tracking?.summary
  const total = Math.max(summary?.total ?? 0, 1)
  const pipeline = [
    { label: "Nháp", value: summary?.draft ?? 0, color: "bg-slate-500" },
    { label: "Chờ duyệt", value: summary?.pendingReview ?? 0, color: "bg-amber-500" },
    { label: "Công khai", value: summary?.published ?? 0, color: "bg-emerald-500" },
    { label: "Từ chối", value: summary?.rejected ?? 0, color: "bg-rose-500" },
  ]

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const next = query.trim()
    setSubmittedQuery(next)
    void load(next)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Theo dõi trạng thái sự kiện</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Giám sát vòng đời sự kiện từ bản nháp, chờ duyệt, công khai đến bị từ chối.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load(submittedQuery)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" />
            Làm mới
          </button>
          <Link
            href="/dashboard/moderation"
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Mở kiểm duyệt
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tổng sự kiện" value={summary?.total ?? 0} icon={ShieldCheck} className="bg-cyan-500/10 text-cyan-600" />
        <StatCard label="Bản nháp" value={summary?.draft ?? 0} icon={FilePenLine} className="bg-slate-500/10 text-slate-600" />
        <StatCard label="Chờ duyệt" value={summary?.pendingReview ?? 0} icon={Clock3} className="bg-amber-500/10 text-amber-600" />
        <StatCard label="Đã công khai" value={summary?.published ?? 0} icon={CheckCircle2} className="bg-emerald-500/10 text-emerald-600" />
        <StatCard label="Bị từ chối" value={summary?.rejected ?? 0} icon={XCircle} className="bg-rose-500/10 text-rose-600" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Phễu trạng thái xét duyệt</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tỷ lệ được tính theo tổng số sự kiện trong phạm vi tìm kiếm hiện tại.
            </p>
          </div>
          {(summary?.cancelled || summary?.completed) ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>Đã hủy: {summary?.cancelled ?? 0}</span>
              <span>Đã hoàn tất: {summary?.completed ?? 0}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div className="flex h-full w-full">
            {pipeline.map((item) => (
              <div
                key={item.label}
                className={item.color}
                style={{ width: `${(item.value / total) * 100}%` }}
                title={`${item.label}: ${item.value}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                {item.label}
              </span>
              <strong className="text-foreground">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2" role="search">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm theo tên sự kiện"
                  className="h-11 w-full rounded-xl border border-border bg-muted pl-9 pr-3 text-sm text-foreground outline-none transition-all focus:border-cyan-500 focus:bg-card focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              <button type="submit" className="rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white transition-colors hover:bg-cyan-700">
                Tìm
              </button>
            </form>

            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc trạng thái">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    filter === item.id
                      ? "bg-cyan-600 text-white"
                      : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-70" />
            <p className="text-sm">Đang tải trạng thái sự kiện...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Inbox className="h-12 w-12 opacity-40" />
            <p className="text-sm">Không có sự kiện phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Sự kiện</th>
                  <th className="px-4 py-3 font-bold">Organizer</th>
                  <th className="px-4 py-3 font-bold">Danh mục</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-4 py-3 font-bold">Cập nhật</th>
                  <th className="px-4 py-3 font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => {
                  const meta = REVIEW_META[event.reviewStatus]
                  const Icon = meta.icon
                  return (
                    <tr key={event._id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-foreground">{event.title}</div>
                        {event.rejectionReason ? (
                          <p className="mt-1 flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                            {event.rejectionReason}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{organizerName(event)}</td>
                      <td className="px-4 py-4 text-muted-foreground">{categoryName(event)}</td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", meta.tone)}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                        {event.status !== "draft" && (
                          <Badge variant="secondary" className="ml-2 text-[11px]">
                            {event.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <div>{formatDate(event.updatedAt)}</div>
                        {event.reviewedAt && (
                          <div className="mt-1 text-xs">Duyệt: {formatDate(event.reviewedAt)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/dashboard/moderation/${event._id}`}
                          className="inline-flex items-center rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-muted"
                        >
                          Xem hồ sơ
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
