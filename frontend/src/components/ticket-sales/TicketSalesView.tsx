"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Percent, Save } from "lucide-react"
import { formatVnd, formatNumber } from "@/lib/utils"
import { mockEvents } from "@/lib/mock-data"

/** Platform fee defaults (mock — the real config will live on the backend). */
const DEFAULT_FEE_PERCENT = 8
const DEFAULT_FIXED_FEE_VND = 2000

const SELLING_EVENTS = mockEvents.filter((e) => e.status === "published" || e.status === "completed")

/**
 * Admin "Ticket sale management": platform fee configuration + per-event
 * sales tracking with computed platform fee / organizer net. Mock state.
 */
export function TicketSalesView() {
  const [feePercent, setFeePercent] = useState(String(DEFAULT_FEE_PERCENT))
  const [fixedFee, setFixedFee] = useState(String(DEFAULT_FIXED_FEE_VND))
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  const appliedPercent = Number(feePercent) || 0
  const appliedFixed = Number(fixedFee) || 0

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    const pct = Number(feePercent)
    const fixed = Number(fixedFee)
    if (!Number.isFinite(pct) || pct < 0 || pct > 30) {
      setError("Phí hoa hồng phải nằm trong khoảng 0–30%.")
      setSaved(false)
      return
    }
    if (!Number.isFinite(fixed) || fixed < 0) {
      setError("Phí cố định mỗi vé không được âm.")
      setSaved(false)
      return
    }
    setError("")
    setSaved(true)
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Quản lý bán vé</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấu hình phí nền tảng và theo dõi tình hình bán vé của các sự kiện đang mở bán.
        </p>
      </div>

      {/* ── Platform fee configuration ─────────────────────────────── */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        noValidate
      >
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Percent className="h-4.5 w-4.5 text-cyan-500" />
          Phí nền tảng
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Áp dụng cho các đơn hàng mới sau khi lưu; đơn đã thanh toán giữ nguyên mức phí cũ.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <div>
            <label htmlFor="fee-percent" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground">
              Hoa hồng trên doanh thu (%)
            </label>
            <input
              id="fee-percent"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none transition-colors focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="fixed-fee" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground">
              Phí cố định mỗi vé (đ)
            </label>
            <input
              id="fixed-fee"
              type="number"
              min={0}
              step={500}
              value={fixedFee}
              onChange={(e) => setFixedFee(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none transition-colors focus:border-cyan-500"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-rose-500">{error}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            Lưu cấu hình
          </button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Đã lưu — áp dụng cho đơn hàng mới.
            </span>
          )}
        </div>
      </form>

      {/* ── Per-event sales tracking ──────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="p-4 font-semibold">Sự kiện</th>
                <th className="p-4 font-semibold">Vé đã bán</th>
                <th className="p-4 text-right font-semibold">Doanh thu gộp</th>
                <th className="p-4 text-right font-semibold">Phí nền tảng ({appliedPercent}%)</th>
                <th className="p-4 text-right font-semibold">Organizer nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SELLING_EVENTS.map((event) => {
                const pct = event.capacity ? Math.round((event.ticketsSold / event.capacity) * 100) : 0
                const platformFee = Math.round(
                  (event.revenue * appliedPercent) / 100 + event.ticketsSold * appliedFixed
                )
                const organizerNet = Math.max(0, event.revenue - platformFee)
                return (
                  <tr key={event.id}>
                    <td className="p-4">
                      <p className="font-semibold text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.location}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="whitespace-nowrap tabular-nums text-foreground">
                          {formatNumber(event.ticketsSold)} / {formatNumber(event.capacity)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right tabular-nums text-foreground">{formatVnd(event.revenue)}</td>
                    <td className="p-4 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {formatVnd(platformFee)}
                    </td>
                    <td className="p-4 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatVnd(organizerNet)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
