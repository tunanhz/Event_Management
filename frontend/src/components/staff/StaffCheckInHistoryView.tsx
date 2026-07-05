"use client"

import { useState } from "react"
import { History, CheckCircle2, AlertTriangle, XCircle, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import type { StaffEvent } from "./staff-checkin-data"
import {
  getCheckinHistory,
  LOG_STATUS_LABELS,
  type CheckinLogStatus,
} from "./staff-history-data"

type LogFilter = "ALL" | CheckinLogStatus

const STATUS_STYLES: Record<CheckinLogStatus, { icon: LucideIcon; chip: string; icon_: string }> = {
  SUCCESS: { icon: CheckCircle2, chip: "bg-emerald-500/12", icon_: "text-emerald-600 dark:text-emerald-400" },
  FAILED: { icon: AlertTriangle, chip: "bg-amber-500/12", icon_: "text-amber-600 dark:text-amber-400" },
  INVALID: { icon: XCircle, chip: "bg-destructive/12", icon_: "text-destructive" },
}

/**
 * Gate scan log for one event: every scan with its outcome, note and the staff
 * member who performed it (accountability per the check-in business rules).
 */
export function StaffCheckInHistoryView({ event }: { event: StaffEvent }) {
  const entries = getCheckinHistory(event.id)
  const [filter, setFilter] = useState<LogFilter>("ALL")

  const visible = filter === "ALL" ? entries : entries.filter((e) => e.status === filter)
  const filters: { key: LogFilter; label: string; count: number }[] = [
    { key: "ALL", label: "Tất cả", count: entries.length },
    ...(Object.keys(LOG_STATUS_LABELS) as CheckinLogStatus[]).map((s) => ({
      key: s as LogFilter,
      label: LOG_STATUS_LABELS[s],
      count: entries.filter((e) => e.status === s).length,
    })),
  ]

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <History className="text-primary" size={22} aria-hidden="true" />
          Lịch sử check-in
        </CardTitle>
        <CardDescription>
          {event.title} — nhật ký các lượt quét tại cổng, kèm kết quả và nhân viên thực hiện.
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

        {/* Log entries */}
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? "Chưa có lượt quét nào được ghi nhận cho sự kiện này."
              : "Không có lượt quét nào khớp bộ lọc."}
          </p>
        ) : (
          <div>
            {visible.map((entry) => {
              const style = STATUS_STYLES[entry.status]
              const Icon = style.icon
              return (
                <div
                  key={entry.id}
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
                        {entry.attendeeName ?? "Mã không xác định"}
                      </span>
                      <span className={cn("text-xs font-semibold", style.icon_)}>
                        {LOG_STATUS_LABELS[entry.status]}
                      </span>
                      {entry.ticketType && (
                        <span className="text-xs text-muted-foreground">· {entry.ticketType}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Mã <span className="font-mono">{entry.code}</span> · NV: {entry.staffName}
                    </div>
                    {entry.note && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.note}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {entry.time}
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
