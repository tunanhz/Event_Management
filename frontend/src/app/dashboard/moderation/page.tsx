"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check, X, Building2, MapPin, Inbox, Eye, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ModerationDecisionModal } from "@/components/moderation/ModerationDecisionModal"
import {
  approveEvent,
  fetchModerationQueue,
  rejectEvent,
} from "@/components/moderation/moderation-api"
import type { ModerationEvent, ModerationStatus } from "@/types"

const TABS: { id: ModerationStatus; label: string }[] = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "waiting_deposit", label: "Chờ cọc" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
]

type Buckets = Record<ModerationStatus, ModerationEvent[]>
const EMPTY: Buckets = { pending: [], approved: [], rejected: [], waiting_deposit: [] }

/** Admin moderation queue — wired to /api/admin/events. */
export default function ModerationPage() {
  const [data, setData] = useState<Buckets>(EMPTY)
  const [tab, setTab] = useState<ModerationStatus>("pending")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectFor, setRejectFor] = useState<ModerationEvent | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pending, approved, rejected, waiting_deposit] = await Promise.all([
        fetchModerationQueue("pending"),
        fetchModerationQueue("approved"),
        fetchModerationQueue("rejected"),
        fetchModerationQueue("waiting_deposit"),
      ])
      setData({ pending, approved, rejected, waiting_deposit })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách kiểm duyệt")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const approve = async (id: string) => {
    setBusyId(id)
    try {
      await approveEvent(id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Duyệt sự kiện thất bại")
    } finally {
      setBusyId(null)
    }
  }

  const confirmReject = async (reason?: string) => {
    if (!rejectFor || !reason) return
    const id = rejectFor.id
    setRejectFor(null)
    setBusyId(id)
    try {
      await rejectEvent(id, reason)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Từ chối sự kiện thất bại")
    } finally {
      setBusyId(null)
    }
  }

  const count = (s: ModerationStatus) => data[s].length
  const rows = data[tab]

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Kiểm duyệt sự kiện</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Xét duyệt các sự kiện do Ban tổ chức gửi lên trước khi công bố.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-cyan-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-bold",
                tab === t.id ? "bg-white/20" : "bg-muted"
              )}
            >
              {count(t.id)}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-60" />
            <p className="text-sm">Đang tải hàng đợi kiểm duyệt…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Inbox className="h-12 w-12 opacity-40" />
            <p className="text-sm">Không có sự kiện nào trong mục này.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((event) => (
              <div key={event.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl gradient-primary text-lg font-bold text-white">
                  {event.title.charAt(0)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <Link
                    href={`/dashboard/moderation/${event.id}`}
                    className="font-semibold text-foreground transition-colors hover:text-cyan-500"
                  >
                    {event.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {event.organizer}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {event.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gửi lúc{" "}
                    {new Date(event.submittedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Link
                    href={`/dashboard/moderation/${event.id}`}
                    title="Xem chi tiết hồ sơ"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                    Chi tiết
                  </Link>
                  {event.status === "pending" ? (
                    <>
                      <button
                        onClick={() => approve(event.id)}
                        disabled={busyId === event.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                      >
                        {busyId === event.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Duyệt
                      </button>
                      <button
                        onClick={() => setRejectFor(event)}
                        disabled={busyId === event.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        Từ chối
                      </button>
                    </>
                  ) : event.status === "waiting_deposit" ? (
                    <Badge variant="warning">Chờ cọc 20%</Badge>
                  ) : (
                    <Badge variant={event.status === "approved" ? "success" : "destructive"}>
                      {event.status === "approved" ? "Đã duyệt" : "Đã từ chối"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rejectFor && (
        <ModerationDecisionModal
          mode="reject"
          eventTitle={rejectFor.title}
          onConfirm={confirmReject}
          onClose={() => setRejectFor(null)}
        />
      )}
    </div>
  )
}
