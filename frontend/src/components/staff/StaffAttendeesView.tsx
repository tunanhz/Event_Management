"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Users, CheckCircle2, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { getAttendees, checkIn as apiCheckIn, type Attendee } from "@/lib/staff-api"

type StatusFilter = "all" | "in" | "out"

interface StaffAttendeesViewProps {
  eventId: string
  eventTitle?: string
}

/**
 * Attendee lookup for the gate: search by name/email/phone/registrationId and
 * admit manually.
 */
export function StaffAttendeesView({ eventId, eventTitle = "Sự kiện" }: StaffAttendeesViewProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  /** Registration ID awaiting the confirming second tap, if any. */
  const [pendingRegId, setPendingRegId] = useState<string | null>(null)

  const fetchAttendees = useCallback(async () => {
    try {
      const data = await getAttendees(eventId)
      setAttendees(data)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải danh sách người tham dự")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchAttendees()
  }, [fetchAttendees])

  const q = query.trim().toLowerCase()
  const visible = attendees.filter((t) => {
    if (filter === "in" && !t.checkedIn) return false
    if (filter === "out" && t.checkedIn) return false
    if (!q) return true
    return [t.attendeeName, t.email, t.phone, t.registrationId]
      .some((field) => field && field.toLowerCase().includes(q))
  })
  const checkedIn = attendees.filter((t) => t.checkedIn).length

  const admit = async (regId: string) => {
    try {
      const result = await apiCheckIn(eventId, regId)
      if (result.status === "SUCCESS") {
        setAttendees((prev) =>
          prev.map((t) => (t.registrationId === regId ? { ...t, checkedIn: true } : t))
        )
      } else {
        alert(result.status === "DUPLICATE" ? "Vé này đã được check-in trước đó." : "Vé không hợp lệ.")
      }
    } catch (err: any) {
      alert(err.message ?? "Đã xảy ra lỗi khi check-in.")
    } finally {
      setPendingRegId(null)
    }
  }

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: attendees.length },
    { key: "in", label: "Đã vào", count: checkedIn },
    { key: "out", label: "Chưa vào", count: attendees.length - checkedIn },
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
          <Users className="text-primary" size={22} aria-hidden="true" />
          Người tham dự
        </CardTitle>
        <CardDescription>
          Danh sách người tham dự — tra cứu vé và check-in thủ công khi khách không quét được mã QR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search + status filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại hoặc mã đơn…"
              aria-label="Tìm người tham dự"
              className="h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Lọc theo trạng thái">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors cursor-pointer",
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
        </div>

        {/* Attendee rows */}
        {visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Không tìm thấy người tham dự phù hợp.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {visible.map((t) => (
              <div
                key={t.registrationId}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary"
                  aria-hidden="true"
                >
                  {t.attendeeName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {t.attendeeName}
                    </span>
                    <Badge variant="outline">{t.ticketType}</Badge>
                    {t.quantity > 1 && (
                      <Badge variant="secondary">SL: {t.quantity}</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.email} {t.phone ? `· ${t.phone}` : ""} · Đơn{" "}
                    <span className="font-mono">{t.registrationId}</span>
                  </div>
                </div>

                {t.checkedIn ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Đã vào cổng
                  </Badge>
                ) : pendingRegId === t.registrationId ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className="h-10 gap-1.5 rounded-lg font-semibold"
                      onClick={() => admit(t.registrationId)}
                    >
                      <CheckCircle2 size={15} aria-hidden="true" />
                      Xác nhận
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 rounded-lg"
                      aria-label="Hủy"
                      onClick={() => setPendingRegId(null)}
                    >
                      <X size={15} aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 rounded-lg font-semibold"
                    onClick={() => setPendingRegId(t.registrationId)}
                  >
                    Check-in thủ công
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
