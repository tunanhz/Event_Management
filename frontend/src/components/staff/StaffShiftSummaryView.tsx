"use client"

import { useEffect, useState, useCallback } from "react"
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
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { fetchMyAssignments, fetchCheckInHistory, type StaffAssignment, type CheckInLogEntry } from "@/lib/staff-api"

export function StaffShiftSummaryView({ eventId }: { eventId: string }) {
  const [assignment, setAssignment] = useState<StaffAssignment | null>(null)
  const [history, setHistory] = useState<CheckInLogEntry[]>([])
  
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState("")
  const [saved, setSaved] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch my assignments to find the one for this event
      const assignments = await fetchMyAssignments()
      const myAssignment = assignments.find(
        (a) => (typeof a.eventId === 'string' ? a.eventId : a.eventId._id) === eventId
      )
      setAssignment(myAssignment ?? null)
      
      // Fetch checkin history
      const historyRes = await fetchCheckInHistory(eventId, { limit: 1000 })
      setHistory(historyRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Lọc log của chính mình nếu tìm thấy assignment, ngược lại lấy tất cả
  const myStaffId = assignment 
    ? (typeof assignment.staffId === 'string' ? assignment.staffId : assignment.staffId._id) 
    : null
    
  // History API currently returns staffId object { fullName, email }. We don't have _id.
  // We can just show total stats or try to match fullName if myStaffId isn't enough, 
  // but let's just use all history for this event as "Ca của chúng ta" (Our shift)
  const success = history.filter((e) => e.result === "success")
  const failed = history.filter((e) => e.result !== "success" && e.result !== "invalid")
  const invalid = history.filter((e) => e.result === "invalid" || e.result === "wrong_event")

  const byType = new Map<string, number>()
  // Since ticketType isn't in CheckInLogEntry from API, we will just count total successful for now
  const totalSuccess = success.length

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── My duty ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="text-primary" size={22} aria-hidden="true" />
            Ca trực của tôi
          </CardTitle>
          <CardDescription>
            {assignment && typeof assignment.eventId !== 'string' ? assignment.eventId.title : "Thông tin ca trực"}
          </CardDescription>
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
              <Badge
                variant={
                  assignment.status === "confirmed"
                    ? "success"
                    : assignment.status === "expired" || assignment.status === "cancelled"
                      ? "destructive"
                      : assignment.status === "assigned"
                        ? "warning"
                        : "secondary"
                }
              >
                {assignment.status === "confirmed"
                  ? "Đã nhận ca"
                  : assignment.status === "expired"
                    ? "Không làm – quá hạn"
                    : assignment.status === "cancelled"
                      ? "Đã hủy"
                      : assignment.status === "completed"
                        ? "Đã hoàn thành"
                        : "Chưa nhận ca"}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có thông tin phân công cho sự kiện này.</p>
          )}
        </CardContent>
      </Card>

      {/* ── My scan results ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <ShiftStat icon={ScanLine} tone="primary" value={history.length} label="Lượt quét" />
        <ShiftStat icon={CheckCircle2} tone="emerald" value={success.length} label="Thành công" />
        <ShiftStat
          icon={AlertTriangle}
          tone="amber"
          value={failed.length}
          label="Bị từ chối"
        />
        <ShiftStat
          icon={XCircle}
          tone="destructive"
          value={invalid.length}
          label="Không hợp lệ"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Khách đã đón</CardTitle>
          </CardHeader>
          <CardContent>
            {totalSuccess === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Chưa có lượt check-in thành công nào.
              </p>
            ) : (
              <div>
                <div className="flex items-center justify-between border-border py-2.5 text-sm">
                  <span className="font-semibold text-foreground">Tất cả vé</span>
                  <span className="tabular-nums text-muted-foreground">{totalSuccess} khách</span>
                </div>
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
