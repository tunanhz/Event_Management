"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  Building2,
  CalendarClock,
  ChevronRight,
  Eye,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Ticket as TicketIcon,
  TrendingUp,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { formatVnd, formatNumber } from "@/lib/utils"
import {
  eventRef,
  fetchAdminTickets,
  type AdminTicket,
  type PaginationMeta,
  type TicketStatus,
} from "@/lib/admin-ticket-api"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "ENDED", label: "Đã kết thúc" },
  { value: "SOLD_OUT", label: "Hết vé" },
  { value: "HIDDEN", label: "Đang ẩn" },
]

const STATUS_LABEL: Record<TicketStatus, string> = {
  ACTIVE: "Đang bán",
  SOLD_OUT: "Hết vé",
  HIDDEN: "Đang ẩn",
}

function isEventDatePast(dateStr?: string): boolean {
  if (!dateStr) return false
  const now = Date.now()
  let dTime = NaN
  if (dateStr.includes("/")) {
    const parts = dateStr.split(" ")
    const datePart = parts[0]
    const timePart = parts[1] || "23:59"
    const [d, m, y] = datePart.split("/")
    const [hh, mm] = timePart.split(":")
    if (d && m && y) {
      dTime = new Date(
        parseInt(y, 10),
        parseInt(m, 10) - 1,
        parseInt(d, 10),
        parseInt(hh || "23", 10),
        parseInt(mm || "59", 10)
      ).getTime()
    }
  } else {
    dTime = new Date(dateStr).getTime()
  }
  return !Number.isNaN(dTime) && dTime < now
}

function getTicketDisplayStatus(
  ticket: AdminTicket,
  eventDate?: string
): { label: string; variant: "success" | "warning" | "secondary" | "destructive" } {
  if (ticket.status === "HIDDEN") {
    return { label: "Đang ẩn", variant: "secondary" }
  }
  if (ticket.status === "SOLD_OUT" || (ticket.quantity > 0 && ticket.soldQuantity >= ticket.quantity)) {
    return { label: "Hết vé", variant: "warning" }
  }
  if (isEventDatePast(eventDate)) {
    return { label: "Đã kết thúc", variant: "secondary" }
  }
  return { label: "Đang bán", variant: "success" }
}

const emptyMeta: PaginationMeta = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  itemsPerPage: 10,
}

function statusVariant(status: TicketStatus): "success" | "warning" | "secondary" {
  if (status === "ACTIVE") return "success"
  if (status === "SOLD_OUT") return "warning"
  return "secondary"
}

interface EventGroup {
  eventId: string
  eventTitle: string
  organizer: string
  location: string
  date: string
  tickets: AdminTicket[]
  totalSold: number
  totalCapacity: number
  totalRevenue: number
  fillRate: number
}

export function TicketSalesView() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedEvent, setSelectedEvent] = useState<EventGroup | null>(null)

  const apiStatus = status === "ENDED" ? "" : (status as TicketStatus | "")

  const load = async (nextPage = page) => {
    setLoading(true)
    setError("")
    try {
      const result = await fetchAdminTickets({
        page: nextPage,
        limit: 100, // Fetch broader sample for grouping
        search: submittedSearch,
        status: apiStatus,
      })
      setTickets(result.tickets)
      setMeta(result.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách vé")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    fetchAdminTickets({ page: 1, limit: 100, search: submittedSearch, status: apiStatus })
      .then((result) => {
        if (cancelled) return
        setTickets(result.tickets)
        setMeta(result.meta)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được danh sách vé")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [submittedSearch, apiStatus])

  // Group tickets by Event
  const groupedEvents = useMemo<EventGroup[]>(() => {
    const map = new Map<string, EventGroup>()

    tickets.forEach((ticket) => {
      const ev = eventRef(ticket)
      const id = ev._id || ticket.eventId?.toString() || "unknown"
      const title = ev.title || "Sự kiện chưa đặt tên"
      const organizer = ev.organizer || "Ban tổ chức"
      const location = ev.location || "Chưa đặt địa điểm"
      const date = ev.startDate || ev.date || ""

      if (!map.has(id)) {
        map.set(id, {
          eventId: id,
          eventTitle: title,
          organizer,
          location,
          date,
          tickets: [],
          totalSold: 0,
          totalCapacity: 0,
          totalRevenue: 0,
          fillRate: 0,
        })
      }

      const group = map.get(id)!
      group.tickets.push(ticket)
      group.totalSold += ticket.soldQuantity
      group.totalCapacity += ticket.quantity
      group.totalRevenue += ticket.soldQuantity * ticket.price
    })

    // Compute fillRate and filter if ENDED status selected
    let list = Array.from(map.values()).map((g) => ({
      ...g,
      fillRate: g.totalCapacity > 0 ? Math.round((g.totalSold / g.totalCapacity) * 100) : 0,
    }))

    if (status === "ENDED") {
      list = list.filter((g) => isEventDatePast(g.date))
    }

    return list
  }, [tickets, status])

  const totals = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc.sold += ticket.soldQuantity
        acc.capacity += ticket.quantity
        acc.revenue += ticket.soldQuantity * ticket.price
        return acc
      },
      { sold: 0, capacity: 0, revenue: 0 }
    )
  }, [tickets])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setSubmittedSearch(search.trim())
    setPage(1)
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-cyan-500"

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Theo dõi bán vé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tình hình bán vé và doanh thu phân loại theo từng sự kiện trên toàn hệ thống.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Làm mới
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tổng vé đã bán</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {formatNumber(totals.sold)} / {formatNumber(totals.capacity)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tổng doanh thu vé</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatVnd(totals.revenue)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tỷ lệ lấp đầy trung bình</p>
          <p className="mt-2 text-2xl font-bold text-cyan-600">
            {totals.capacity > 0 ? Math.round((totals.sold / totals.capacity) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
          <form onSubmit={submitSearch} className="flex gap-2" role="search">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm tên sự kiện hoặc loại vé"
                className="h-11 w-full rounded-xl border border-border bg-muted pl-9 pr-3 text-sm text-foreground outline-none transition-all focus:border-cyan-500 focus:bg-card focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <Button type="submit">Tìm</Button>
          </form>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as TicketStatus | "")
              setPage(1)
            }}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped Events Ticket List */}
      {loading ? (
        <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin opacity-70" />
          <p className="text-sm">Đang tải danh sách theo sự kiện...</p>
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          <TicketIcon className="mx-auto h-10 w-10 opacity-40 mb-2" />
          <p className="text-sm">Không tìm thấy vé hoặc sự kiện nào phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedEvents.map((group) => (
            <div
              key={group.eventId}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden transition-all hover:border-cyan-500/40"
            >
              {/* Event Header */}
              <div className="border-b border-border bg-muted/40 p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-foreground">{group.eventTitle}</h3>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {group.tickets.length} loại vé
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-cyan-600" /> {group.organizer}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-cyan-600" /> {group.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Doanh thu sự kiện</p>
                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatVnd(group.totalRevenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Vé đã bán</p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatNumber(group.totalSold)} / {formatNumber(group.totalCapacity)} ({group.fillRate}%)
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-cyan-500/30 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                    onClick={() => setSelectedEvent(group)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Chi tiết bán vé
                  </Button>
                </div>
              </div>

              {/* Tickets Mini Table for this Event */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground bg-muted/20">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Loại vé</th>
                      <th className="px-4 py-2.5 font-semibold">Đơn giá</th>
                      <th className="px-4 py-2.5 font-semibold">Tiến độ bán vé</th>
                      <th className="px-4 py-2.5 font-semibold">Trạng thái</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {group.tickets.map((ticket) => {
                      const soldPct = ticket.quantity ? Math.round((ticket.soldQuantity / ticket.quantity) * 100) : 0
                      return (
                        <tr key={ticket._id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{ticket.ticketName}</p>
                            {ticket.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-foreground">{formatVnd(ticket.price)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-cyan-500"
                                  style={{ width: `${Math.min(100, soldPct)}%` }}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-foreground">
                                {formatNumber(ticket.soldQuantity)} / {formatNumber(ticket.quantity)} ({soldPct}%)
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const st = getTicketDisplayStatus(ticket, group.date)
                              return <Badge variant={st.variant}>{st.label}</Badge>
                            })()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatVnd(ticket.soldQuantity * ticket.price)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal per Event */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">Báo cáo chi tiết tình hình bán vé</span>
                <h3 className="text-xl font-bold text-foreground mt-1">{selectedEvent.eventTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                  <span>BTC: {selectedEvent.organizer}</span>
                  <span>•</span>
                  <span>Địa điểm: {selectedEvent.location}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Event Summary Bar inside Modal */}
            <div className="grid gap-3 sm:grid-cols-3 my-5">
              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <p className="text-xs text-muted-foreground">Tổng doanh thu bán vé</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatVnd(selectedEvent.totalRevenue)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <p className="text-xs text-muted-foreground">Số vé bán / Tổng phát hành</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {formatNumber(selectedEvent.totalSold)} / {formatNumber(selectedEvent.totalCapacity)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                <p className="text-xs text-muted-foreground">Tỷ lệ lấp đầy vé</p>
                <p className="text-xl font-bold text-cyan-600 mt-1">
                  {selectedEvent.fillRate}%
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-foreground">
                <span>Tiến độ lấp đầy vé sự kiện</span>
                <span>{selectedEvent.fillRate}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, selectedEvent.fillRate)}%` }}
                />
              </div>
            </div>

            {/* Ticket Breakdown List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Chi tiết các loại vé ({selectedEvent.tickets.length})</h4>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Tên loại vé</th>
                      <th className="px-4 py-3 font-semibold">Đơn giá</th>
                      <th className="px-4 py-3 font-semibold">Số lượng bán</th>
                      <th className="px-4 py-3 font-semibold">Tỷ lệ bán</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold text-right">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedEvent.tickets.map((t) => {
                      const pct = t.quantity ? Math.round((t.soldQuantity / t.quantity) * 100) : 0
                      return (
                        <tr key={t._id} className="hover:bg-muted/30">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-foreground">{t.ticketName}</p>
                            {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                            <p className="text-[11px] text-muted-foreground mt-0.5">Giới hạn mua: {t.minPerOrder}-{t.maxPerOrder} vé/đơn</p>
                          </td>
                          <td className="px-4 py-3.5 tabular-nums">{formatVnd(t.price)}</td>
                          <td className="px-4 py-3.5 tabular-nums">
                            {formatNumber(t.soldQuantity)} / {formatNumber(t.quantity)}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                              <span className="text-xs font-semibold">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {(() => {
                              const st = getTicketDisplayStatus(t, selectedEvent.date)
                              return <Badge variant={st.variant}>{st.label}</Badge>
                            })()}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatVnd(t.soldQuantity * t.price)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="button" variant="outline" onClick={() => setSelectedEvent(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
