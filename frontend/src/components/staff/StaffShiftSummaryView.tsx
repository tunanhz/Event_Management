"use client"

import { useState } from "react"
import {
  ClipboardCheck,
  BadgeCheck,
  DoorOpen,
  Clock,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import type { StaffEvent } from "./staff-checkin-data"
import { getAssignmentByEventId, TIMING_LABELS } from "./staff-assignments-data"
import { getCheckinHistory } from "./staff-history-data"

/**
 * Personal shift recap for handover: my duty details, my scan results for this
 * event (from the gate log) and a handover note for the next shift.
 */
export function StaffShiftSummaryView({ event }: { event: StaffEvent }) {
  const assignment = getAssignmentByEventId(event.id)
  // "Bạn" marks entries scanned by the signed-in staff member in the mock log.
  const mine = getCheckinHistory(event.id).filter((e) => e.staffName === "Bạn")
  const success = mine.filter((e) => e.status === "SUCCESS")

  const byType = new Map<string, number>()
  for (const entry of success) {
    if (entry.ticketType) byType.set(entry.ticketType, (byType.get(entry.ticketType) ?? 0) + 1)
  }

  const [note, setNote] = useState("")
  const [saved, setSaved] = useState(false)

  return (
    <div className="space-y-6">
      {/* ── My duty ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="text-primary" size={22} aria-hidden="true" />
            Ca trực của tôi
          </CardTitle>
          <CardDescription>{event.title}</CardDescription>
        </CardHeader>
        <CardContent>
          {assignment ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <BadgeCheck size={15} className="text-primary" aria-hidden="true" />
                {assignment.responsibility}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <DoorOpen size={15} aria-hidden="true" />
                {assignment.gate}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock size={15} aria-hidden="true" />
                {assignment.shift}
              </span>
              <Badge variant={assignment.timing === "today" ? "success" : "secondary"}>
                {TIMING_LABELS[assignment.timing]}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có thông tin phân công.</p>
          )}
        </CardContent>
      </Card>

      {/* ── My scan results ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <ShiftStat icon={ScanLine} tone="primary" value={mine.length} label="Lượt quét của tôi" />
        <ShiftStat icon={CheckCircle2} tone="emerald" value={success.length} label="Thành công" />
        <ShiftStat
          icon={AlertTriangle}
          tone="amber"
          value={mine.filter((e) => e.status === "FAILED").length}
          label="Bị từ chối"
        />
        <ShiftStat
          icon={XCircle}
          tone="destructive"
          value={mine.filter((e) => e.status === "INVALID").length}
          label="Không hợp lệ"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Khách tôi đã đón, theo loại vé</CardTitle>
          </CardHeader>
          <CardContent>
            {byType.size === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Chưa có lượt check-in thành công nào trong ca của bạn.
              </p>
            ) : (
              <div>
                {Array.from(byType.entries()).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between border-t border-border py-2.5 text-sm first:border-t-0 first:pt-0"
                  >
                    <span className="font-semibold text-foreground">{type}</span>
                    <span className="tabular-nums text-muted-foreground">{count} khách</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Handover note ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ghi chú bàn giao ca</CardTitle>
            <CardDescription>
              Lưu lại tình hình tại cổng cho ca sau (sự cố, khách cần lưu ý…).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label htmlFor="shift-handover-note" className="sr-only">
              Ghi chú bàn giao ca
            </label>
            <textarea
              id="shift-handover-note"
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setSaved(false)
              }}
              placeholder="Ví dụ: máy quét cổng A chập chờn, đã báo kỹ thuật…"
              className="w-full resize-y rounded-xl border border-border bg-muted p-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
            />
            <div className="flex items-center gap-3">
              <Button className="h-10 rounded-lg" disabled={!note.trim()} onClick={() => setSaved(true)}>
                Lưu ghi chú
              </Button>
              {saved && (
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                  role="status"
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Đã lưu ghi chú bàn giao.
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const TONES: Record<string, { chip: string; icon: string }> = {
  emerald: { chip: "bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400" },
  amber: { chip: "bg-amber-500/15", icon: "text-amber-600 dark:text-amber-400" },
  destructive: { chip: "bg-destructive/12", icon: "text-destructive" },
  primary: { chip: "bg-primary/12", icon: "text-primary" },
}

/** Compact counter tile for the shift recap. */
function ShiftStat({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: LucideIcon
  tone: keyof typeof TONES
  value: number
  label: string
}) {
  const t = TONES[tone] ?? TONES.primary
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", t.chip)} aria-hidden="true">
        <Icon size={22} className={t.icon} />
      </span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold tabular-nums text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
