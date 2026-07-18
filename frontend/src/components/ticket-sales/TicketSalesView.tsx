"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  Loader2,
  RotateCcw,
  Search,
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

const STATUS_OPTIONS: { value: TicketStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Đang bán" },
  { value: "SOLD_OUT", label: "Hết vé" },
  { value: "HIDDEN", label: "Đang ẩn" },
]

const STATUS_LABEL: Record<TicketStatus, string> = {
  ACTIVE: "Đang bán",
  SOLD_OUT: "Hết vé",
  HIDDEN: "Đang ẩn",
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

/**
 * Admin ticket-sales monitoring: read-only data from /api/admin/tickets.
 * Ticket configuration and inventory changes belong to the Organizer workspace.
 */
export function TicketSalesView() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [status, setStatus] = useState<TicketStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async (nextPage = page) => {
    setLoading(true)
    setError("")
    try {
      const result = await fetchAdminTickets({
        page: nextPage,
        limit: 10,
        search: submittedSearch,
        status,
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
    fetchAdminTickets({ page, limit: 10, search: submittedSearch, status })
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
  }, [page, submittedSearch, status])

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
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none transition-colors focus:border-cyan-500"

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quản trị vé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tình hình bán vé và doanh thu toàn hệ thống. Cấu hình loại vé thuộc quyền Organizer.
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Vé đã bán · trang hiện tại</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {formatNumber(totals.sold)} / {formatNumber(totals.capacity)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Doanh thu gộp trang hiện tại</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatVnd(totals.revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tỷ lệ bán · trang hiện tại</p>
          <p className="mt-2 text-2xl font-bold text-cyan-600">
            {totals.capacity > 0 ? Math.round((totals.sold / totals.capacity) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
            <form onSubmit={submitSearch} className="flex gap-2" role="search">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm tên loại vé"
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

        {loading ? (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-70" />
            <p className="text-sm">Đang tải danh sách vé...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Loại vé</th>
                  <th className="px-4 py-3 font-bold">Sự kiện</th>
                  <th className="px-4 py-3 font-bold">Giá</th>
                  <th className="px-4 py-3 font-bold">Đã bán / Tổng</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-4 py-3 font-bold">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => {
                  const event = eventRef(ticket)
                  const soldPct = ticket.quantity ? Math.round((ticket.soldQuantity / ticket.quantity) * 100) : 0
                  return (
                    <tr key={ticket._id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-foreground">{ticket.ticketName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Mỗi đơn: {ticket.minPerOrder}-{ticket.maxPerOrder}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-foreground">{event.title ?? "—"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{event.location ?? ""}</p>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-foreground">{formatVnd(ticket.price)}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, soldPct)}%` }} />
                          </div>
                          <span className="whitespace-nowrap tabular-nums text-foreground">
                            {formatNumber(ticket.soldQuantity)} / {formatNumber(ticket.quantity)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusVariant(ticket.status)}>{STATUS_LABEL[ticket.status]}</Badge>
                      </td>
                      <td className="px-4 py-4 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {formatVnd(ticket.soldQuantity * ticket.price)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>Tổng {meta.totalItems.toLocaleString("vi-VN")} loại vé</span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</Button>
            <span>Trang {meta.currentPage}/{Math.max(1, meta.totalPages)}</span>
            <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Sau</Button>
          </div>
        </div>
      </div>

    </div>
  )
}
