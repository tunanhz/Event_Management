"use client"

import { useEffect, useState, useCallback } from "react"
import { History, CheckCircle2, AlertTriangle, XCircle, Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { getCheckInHistory, type CheckInHistoryEntry } from "@/lib/staff-api"

type LogFilter = "ALL" | "SUCCESS" | "DUPLICATE" | "INVALID"

const LOG_STATUS_LABELS: Record<string, string> = {
  SUCCESS: "Thành công",
  DUPLICATE: "Trùng lặp / Đã quét",
  INVALID: "Không hợp lệ",
}

const STATUS_STYLES: Record<string, { icon: LucideIcon; chip: string; icon_: string }> = {
  SUCCESS: { icon: CheckCircle2, chip: "bg-emerald-500/12", icon_: "text-emerald-600 dark:text-emerald-400" },
  DUPLICATE: { icon: AlertTriangle, chip: "bg-amber-500/12", icon_: "text-amber-600 dark:text-amber-400" },
  INVALID: { icon: XCircle, chip: "bg-destructive/12", icon_: "text-destructive" },
}

interface StaffCheckInHistoryViewProps {
  eventId: string
  eventTitle?: string
}

/**
 * Gate scan log for one event: every scan with its outcome, note and the staff
 * member who performed it.
 */
export function StaffCheckInHistoryView({ eventId, eventTitle = "Sự kiện" }: StaffCheckInHistoryViewProps) {
  const [entries, setEntries] = useState<CheckInHistoryEntry[]>([])
  const [filter, setFilter] = useState<LogFilter>("ALL")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchHistory = useCallback(async () => {
    try {
      const data = await getCheckInHistory(eventId)
      setEntries(data)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải lịch sử check-in")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Map status from entry or assume SUCCESS since history usually returns successful check-ins,
  // but if the API returns a status we use it, otherwise fall back to SUCCESS.
  const getEntryStatus = (entry: any): LogFilter => {
    return entry.status || "SUCCESS"
  }

  const visible = filter === "ALL" ? entries : entries.filter((e) => getEntryStatus(e) === filter)
  
  const getCount = (status: LogFilter) => {
    if (status === "ALL") return entries.length
    return entries.filter((e) => getEntryStatus(e) === status).length
  }

  const filters: { key: LogFilter; label: string; count: number }[] = [
    { key: "ALL", label: "Tất cả", count: getCount("ALL") },
    { key: "SUCCESS", label: "Thành công", count: getCount("SUCCESS") },
    { key: "DUPLICATE", label: "Trùng lặp", count: getCount("DUPLICATE") },
    { key: "INVALID", label: "Không hợp lệ", count: getCount("INVALID") },
  ]

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
        <p className="font-semibold text-destructive">{error}</p>
      </div>
    )
  }

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
                "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors cursor-pointer",
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

        {/* Log entries */}
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "Chưa có lượt quét nào được ghi nhận cho sự kiện này."
              : "Không có lượt quét nào khớp bộ lọc."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((entry) => {
              const entryStatus = getEntryStatus(entry)
              const style = STATUS_STYLES[entryStatus] || STATUS_STYLES.SUCCESS
              const Icon = style.icon
              return (
                <div
                  key={entry.checkInId}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
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
                        {entry.attendeeName}
                      </span>
                      <span className={cn("text-xs font-semibold", style.icon_)}>
                        {LOG_STATUS_LABELS[entryStatus] || entryStatus}
                      </span>
                      {entry.ticketType && (
                        <span className="text-xs text-muted-foreground">· {entry.ticketType}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Đơn <span className="font-mono">{entry.registrationId}</span> · NV: {entry.staffName}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {new Date(entry.checkInTime).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
