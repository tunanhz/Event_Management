"use client"

import { useEffect, useState, useCallback } from "react"
import { History, CheckCircle2, AlertTriangle, XCircle, type LucideIcon, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { fetchCheckInHistory, type CheckInLogEntry, type CheckInResult, type PaginationMeta } from "@/lib/staff-api"

type LogFilter = "ALL" | CheckInResult

const STATUS_STYLES: Record<CheckInResult, { icon: LucideIcon; chip: string; icon_: string }> = {
  success: { icon: CheckCircle2, chip: "bg-emerald-500/12", icon_: "text-emerald-600 dark:text-emerald-400" },
  duplicate: { icon: AlertTriangle, chip: "bg-amber-500/12", icon_: "text-amber-600 dark:text-amber-400" },
  invalid: { icon: XCircle, chip: "bg-destructive/12", icon_: "text-destructive" },
  wrong_event: { icon: XCircle, chip: "bg-destructive/12", icon_: "text-destructive" },
  cancelled: { icon: XCircle, chip: "bg-destructive/12", icon_: "text-destructive" },
}

const LOG_STATUS_LABELS: Record<CheckInResult, string> = {
  success: "Thành công",
  duplicate: "Trùng lặp",
  invalid: "Không hợp lệ",
  wrong_event: "Sai sự kiện",
  cancelled: "Đã hủy",
}

export function StaffCheckInHistoryView({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<CheckInLogEntry[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filter, setFilter] = useState<LogFilter>("ALL")
  const [page, setPage] = useState(1)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchCheckInHistory(eventId, { page, limit: 50 })
      setEntries(result.data)
      setMeta(result.meta)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải lịch sử check-in.")
    } finally {
      setLoading(false)
    }
  }, [eventId, page])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Lọc offline (do API hiện tại đang filter cứng result='success' hoặc không filter, 
  // tạm thời ta filter offline trên current page hoặc đợi update API sau)
  const visible = filter === "ALL" ? entries : entries.filter((e) => e.result === filter)
  
  const filters: { key: LogFilter; label: string; count: number }[] = [
    { key: "ALL", label: "Tất cả", count: entries.length },
    ...(Object.keys(LOG_STATUS_LABELS) as CheckInResult[]).map((s) => ({
      key: s as LogFilter,
      label: LOG_STATUS_LABELS[s],
      count: entries.filter((e) => e.result === s).length,
    })).filter(f => f.count > 0 || filter === f.key), // Only show filters with items, unless selected
  ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <History className="text-primary" size={22} aria-hidden="true" />
          Lịch sử check-in
        </CardTitle>
        <CardDescription>
          Nhật ký các lượt quét tại cổng, kèm kết quả và nhân viên thực hiện.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc theo kết quả">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {f.label}
              <span className="tabular-nums opacity-80">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Loading / Error */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-destructive">
            <AlertCircle size={32} className="mb-2" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadHistory}>
              Thử lại
            </Button>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "Chưa có lượt quét nào được ghi nhận cho sự kiện này."
              : "Không có lượt quét nào khớp bộ lọc."}
          </p>
        ) : (
          <div>
            {visible.map((entry) => {
              const style = STATUS_STYLES[entry.result]
              const Icon = style.icon
              return (
                <div
                  key={entry._id}
                  className="flex items-start gap-3 border-t border-border py-3 first:border-t-0"
                >
                  <span
                    className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", style.chip)}
                    aria-hidden="true"
                  >
                    <Icon size={19} className={style.icon_} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {entry.ticketCode ?? "Mã không xác định"}
                      </span>
                      <span className={cn("text-xs font-semibold", style.icon_)}>
                        {LOG_STATUS_LABELS[entry.result]}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Mã <span className="font-mono">{entry.ticketCode}</span> 
                      {entry.staffId && ` · NV: ${entry.staffId.fullName}`}
                      {entry.gate && ` · Cổng: ${entry.gate}`}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {new Date(entry.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        
        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => p - 1)}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground">
              Trang {meta.currentPage} / {meta.totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage(p => p + 1)}
            >
              Sau
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
