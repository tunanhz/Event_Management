"use client"

import type { ReactNode } from "react"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  CheckCircle2,
  Edit3,
  EyeOff,
  Loader2,
  Percent,
  RotateCcw,
  Save,
  Search,
  Ticket,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/Button"
import { formatVnd, formatNumber } from "@/lib/utils"
import {
  deleteAdminTicket,
  eventRef,
  fetchAdminTickets,
  updateAdminTicket,
  updateAdminTicketStatus,
  type AdminTicket,
  type PaginationMeta,
  type TicketStatus,
} from "@/lib/admin-ticket-api"

const DEFAULT_FEE_PERCENT = 8
const DEFAULT_FIXED_FEE_VND = 2000

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

interface TicketForm {
  ticketName: string
  description: string
  price: string
  quantity: string
  minPerOrder: string
  maxPerOrder: string
  image: string
  saleStart: string
  saleEnd: string
  status: TicketStatus
}

function toInputDate(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIso(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function makeForm(ticket: AdminTicket): TicketForm {
  return {
    ticketName: ticket.ticketName,
    description: ticket.description ?? "",
    price: String(ticket.price),
    quantity: String(ticket.quantity),
    minPerOrder: String(ticket.minPerOrder ?? 1),
    maxPerOrder: String(ticket.maxPerOrder ?? 10),
    image: ticket.image ?? "",
    saleStart: toInputDate(ticket.saleStart),
    saleEnd: toInputDate(ticket.saleEnd),
    status: ticket.status,
  }
}

function statusVariant(status: TicketStatus): "success" | "warning" | "secondary" {
  if (status === "ACTIVE") return "success"
  if (status === "SOLD_OUT") return "warning"
  return "secondary"
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Admin Ticket Administration: live data from /api/admin/tickets.
 * Organizer ticket endpoints remain unchanged; this screen is an admin override.
 */
export function TicketSalesView() {
  const [feePercent, setFeePercent] = useState(String(DEFAULT_FEE_PERCENT))
  const [fixedFee, setFixedFee] = useState(String(DEFAULT_FIXED_FEE_VND))
  const [configError, setConfigError] = useState("")
  const [saved, setSaved] = useState(false)

  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [submittedSearch, setSubmittedSearch] = useState("")
  const [status, setStatus] = useState<TicketStatus | "">("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<AdminTicket | null>(null)
  const [form, setForm] = useState<TicketForm | null>(null)

  const appliedPercent = Number(feePercent) || 0
  const appliedFixed = Number(fixedFee) || 0

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

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault()
    const pct = Number(feePercent)
    const fixed = Number(fixedFee)
    if (!Number.isFinite(pct) || pct < 0 || pct > 30) {
      setConfigError("Phí hoa hồng phải nằm trong khoảng 0-30%.")
      setSaved(false)
      return
    }
    if (!Number.isFinite(fixed) || fixed < 0) {
      setConfigError("Phí cố định mỗi vé không được âm.")
      setSaved(false)
      return
    }
    setConfigError("")
    setSaved(true)
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setSubmittedSearch(search.trim())
    setPage(1)
  }

  const openEdit = (ticket: AdminTicket) => {
    setEditing(ticket)
    setForm(makeForm(ticket))
  }

  const saveTicket = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing || !form) return
    setSaving(true)
    setError("")
    try {
      await updateAdminTicket(editing._id, {
        ticketName: form.ticketName,
        description: form.description,
        price: Number(form.price),
        quantity: Number(form.quantity),
        minPerOrder: Number(form.minPerOrder),
        maxPerOrder: Number(form.maxPerOrder),
        image: form.image,
        saleStart: toIso(form.saleStart),
        saleEnd: toIso(form.saleEnd),
        status: form.status,
      })
      setEditing(null)
      setForm(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật vé thất bại")
    } finally {
      setSaving(false)
    }
  }

  const quickStatus = async (ticket: AdminTicket, nextStatus: TicketStatus) => {
    setSaving(true)
    setError("")
    try {
      await updateAdminTicketStatus(ticket._id, nextStatus)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật trạng thái vé thất bại")
    } finally {
      setSaving(false)
    }
  }

  const removeTicket = async (ticket: AdminTicket) => {
    const ok = window.confirm(`Xóa loại vé "${ticket.ticketName}"? Vé đã bán sẽ không được phép xóa.`)
    if (!ok) return
    setSaving(true)
    setError("")
    try {
      await deleteAdminTicket(ticket._id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa vé thất bại")
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none transition-colors focus:border-cyan-500"

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Quản trị vé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tồn kho, doanh thu và quản lý loại vé trên toàn hệ thống.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
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
          <p className="text-xs font-semibold uppercase text-muted-foreground">Vé đã bán</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {formatNumber(totals.sold)} / {formatNumber(totals.capacity)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Doanh thu gộp trang hiện tại</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{formatVnd(totals.revenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Phí nền tảng ước tính</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {formatVnd(Math.round((totals.revenue * appliedPercent) / 100 + totals.sold * appliedFixed))}
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveConfig} className="rounded-xl border border-border bg-card p-5 shadow-sm" noValidate>
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Percent className="h-4.5 w-4.5 text-cyan-500" />
          Cấu hình phí nền tảng
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wider text-foreground">
            Hoa hồng trên doanh thu (%)
            <input className={inputClass} type="number" min={0} max={30} step={0.5} value={feePercent} onChange={(e) => setFeePercent(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wider text-foreground">
            Phí cố định mỗi vé (đ)
            <input className={inputClass} type="number" min={0} step={500} value={fixedFee} onChange={(e) => setFixedFee(e.target.value)} />
          </label>
        </div>
        {configError && <p role="alert" className="mt-3 text-sm font-medium text-rose-500">{configError}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Lưu cấu hình
          </Button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Đã lưu trong phiên làm việc.
            </span>
          )}
        </div>
      </form>

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
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b border-border bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Loại vé</th>
                  <th className="px-4 py-3 font-bold">Sự kiện</th>
                  <th className="px-4 py-3 font-bold">Giá</th>
                  <th className="px-4 py-3 font-bold">Đã bán / Tổng</th>
                  <th className="px-4 py-3 font-bold">Trạng thái</th>
                  <th className="px-4 py-3 font-bold">Doanh thu</th>
                  <th className="px-4 py-3 font-bold">Thao tác</th>
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
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(ticket)}>
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                            Sửa
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void quickStatus(ticket, ticket.status === "HIDDEN" ? "ACTIVE" : "HIDDEN")}>
                            <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                            {ticket.status === "HIDDEN" ? "Hiện" : "Ẩn"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => void quickStatus(ticket, "SOLD_OUT")}>
                            <Ticket className="mr-1.5 h-3.5 w-3.5" />
                            Hết vé
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => void removeTicket(ticket)}>
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Xóa
                          </Button>
                        </div>
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

      {editing && form && (
        <Modal title={`Sửa loại vé: ${editing.ticketName}`} onClose={() => setEditing(null)}>
          <form onSubmit={saveTicket} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Tên vé
                <input className={inputClass} value={form.ticketName} onChange={(event) => setForm({ ...form, ticketName: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Trạng thái
                <select className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as TicketStatus })}>
                  {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Giá
                <input className={inputClass} type="number" min={0} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Tổng số vé
                <input className={inputClass} type="number" min={editing.soldQuantity} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Tối thiểu mỗi đơn
                <input className={inputClass} type="number" min={1} value={form.minPerOrder} onChange={(event) => setForm({ ...form, minPerOrder: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Tối đa mỗi đơn
                <input className={inputClass} type="number" min={1} value={form.maxPerOrder} onChange={(event) => setForm({ ...form, maxPerOrder: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Mở bán
                <input className={inputClass} type="datetime-local" value={form.saleStart} onChange={(event) => setForm({ ...form, saleStart: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                Kết thúc bán
                <input className={inputClass} type="datetime-local" value={form.saleEnd} onChange={(event) => setForm({ ...form, saleEnd: event.target.value })} />
              </label>
            </div>
            <label className="space-y-1.5 text-sm font-semibold text-foreground">
              Ảnh vé
              <input className={inputClass} value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-foreground">
              Mô tả
              <textarea className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-cyan-500" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="rounded-xl bg-cyan-500/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-300">
              Đã bán {formatNumber(editing.soldQuantity)} vé. Tổng số vé không được nhỏ hơn số đã bán.
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Hủy</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
