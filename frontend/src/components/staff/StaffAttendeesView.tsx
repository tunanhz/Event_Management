"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Users, CheckCircle2, X, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { fetchAttendees, manualCheckIn, type AttendeeRow, type PaginationMeta } from "@/lib/staff-api"

type StatusFilter = "all" | "in" | "out"

export function StaffAttendeesView({ eventId }: { eventId: string }) {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("")
  
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)

  /** registrationId awaiting the confirming second tap, if any. */
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [admittingId, setAdmittingId] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [query])

  // Fetch attendees
  const loadAttendees = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const checkedIn = filter === "all" ? undefined : filter === "in" ? true : false
      const result = await fetchAttendees(eventId, {
        page,
        limit: 20,
        search: debouncedQuery || undefined,
        checkedIn,
      })
      setAttendees(result.data)
      setMeta(result.meta)
    } catch (err: any) {
      setError(err.message ?? "Không thể tải danh sách người tham dự.")
    } finally {
      setLoading(false)
    }
  }, [eventId, page, debouncedQuery, filter])

  useEffect(() => {
    loadAttendees()
  }, [loadAttendees])

  const handleFilterChange = (f: StatusFilter) => {
    setFilter(f)
    setPage(1)
  }

  const admit = async (registrationId: string) => {
    setAdmittingId(registrationId)
    try {
      const updated = await manualCheckIn(eventId, registrationId)
      // Update local state to reflect the change immediately
      setAttendees((prev) =>
        prev.map((a) => (a._id === registrationId ? updated : a))
      )
    } catch (err: any) {
      alert(err.message ?? "Check-in thủ công thất bại")
    } finally {
      setAdmittingId(null)
      setPendingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="text-primary" size={22} aria-hidden="true" />
          Người tham dự
        </CardTitle>
        <CardDescription>
          Tra cứu vé và check-in thủ công khi khách không quét được mã QR.
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
              placeholder="Tìm theo tên, email, mã vé hoặc mã đơn…"
              aria-label="Tìm người tham dự"
              className="h-11 w-full rounded-xl border border-border bg-muted pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Lọc theo trạng thái">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "in", label: "Đã vào" },
                { key: "out", label: "Chưa vào" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => handleFilterChange(f.key)}
                aria-pressed={filter === f.key}
                className={cn(
                  "inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Error States */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-destructive">
            <AlertCircle size={32} className="mb-2" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={loadAttendees}>
              Thử lại
            </Button>
          </div>
        ) : loading && attendees.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : attendees.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Không tìm thấy người tham dự phù hợp.
          </p>
        ) : (
          <div>
            {attendees.map((row) => {
              const name = row.participantId?.fullName ?? "Khách vãng lai"
              const email = row.participantId?.email ?? "Không có email"
              const ticketName = row.ticketId?.ticketName ?? "Vé chung"
              const isCheckedIn = !!row.checkedInAt
              
              return (
                <div
                  key={row._id}
                  className="flex flex-wrap items-center gap-3 border-t border-border py-3 first:border-t-0"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {name}
                      </span>
                      <Badge variant="outline">{ticketName}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {email} · Vé <span className="font-mono">{row.ticketCode ?? row._id}</span>
                    </div>
                  </div>
  
                  {isCheckedIn ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 size={13} aria-hidden="true" />
                      Đã vào lúc {new Date(row.checkedInAt!).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                  ) : pendingId === row._id ? (
                    <div className="flex items-center gap-1.5">
                      <Button 
                        size="sm" 
                        className="h-10 gap-1.5 rounded-lg" 
                        onClick={() => admit(row._id)}
                        disabled={admittingId === row._id}
                      >
                        {admittingId === row._id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} aria-hidden="true" />}
                        Xác nhận
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 rounded-lg"
                        aria-label="Hủy"
                        onClick={() => setPendingId(null)}
                        disabled={admittingId === row._id}
                      >
                        <X size={15} aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 rounded-lg"
                      onClick={() => setPendingId(row._id)}
                    >
                      Check-in thủ công
                    </Button>
                  )}
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
