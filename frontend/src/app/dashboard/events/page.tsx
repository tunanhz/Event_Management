"use client"

import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MapPin,
  Calendar,
  Users,
  Filter,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { mockEvents } from "@/lib/mock-data"
import { formatCurrency, formatNumber } from "@/lib/utils"

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" }> = {
  published: { label: "Đã công bố", variant: "success" },
  draft:     { label: "Bản nháp",   variant: "warning" },
  cancelled: { label: "Đã hủy",     variant: "destructive" },
  completed: { label: "Hoàn thành", variant: "default" },
}

export default function EventsPage() {
  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Quản lý Sự kiện
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Tạo, chỉnh sửa và theo dõi tất cả sự kiện của bạn.
          </p>
        </div>
        <Button className="shrink-0 rounded-xl gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Tạo sự kiện mới
        </Button>
      </div>

      {/* Filter & search bar */}
      <Card className="rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Danh sách sự kiện</CardTitle>
              <CardDescription>Tổng cộng {mockEvents.length} sự kiện</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <input
                  type="search"
                  placeholder="Tìm sự kiện..."
                  className="h-9 w-52 rounded-xl border pl-9 pr-3 text-sm outline-none focus:ring-2"
                  style={{
                    background: "var(--muted)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 h-9">
                <Filter className="h-3.5 w-3.5" />
                Lọc
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Event cards (card-list style instead of plain table) */}
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {mockEvents.map((event, idx) => {
              const fillPercent = Math.round((event.ticketsSold / event.capacity) * 100)
              const status = statusMap[event.status] ?? { label: event.status, variant: "default" as const }
              return (
                <div
                  key={event.id}
                  className="group flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-cyan-50/40 sm:flex-row sm:items-center"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Avatar */}
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white text-lg font-bold gradient-primary shadow-sm">
                    {event.title.charAt(0)}
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                        {event.title}
                      </p>
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                    <div
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.date).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {formatNumber(event.ticketsSold)}/{formatNumber(event.capacity)} chỗ
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <div
                        className="h-1.5 flex-1 rounded-full overflow-hidden"
                        style={{ background: "var(--border)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${fillPercent}%`,
                            background:
                              fillPercent >= 90
                                ? "linear-gradient(90deg, #f43f5e, #fb7185)"
                                : fillPercent >= 60
                                ? "linear-gradient(90deg, #0891b2, #22d3ee)"
                                : "linear-gradient(90deg, #34d399, #6ee7b7)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-9 text-right" style={{ color: "var(--muted-foreground)" }}>
                        {fillPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="hidden flex-col items-end sm:flex">
                    <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                      {formatCurrency(event.revenue)}
                    </span>
                    <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      Doanh thu
                    </span>
                  </div>

                  {/* Actions — always visible on touch, subtle until hover on desktop */}
                  <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-60 sm:group-hover:opacity-100">
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-cyan-100 hover:text-cyan-700 transition-colors"
                      title="Xem chi tiết"
                      aria-label={`Xem chi tiết ${event.title}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-cyan-100 hover:text-cyan-700 transition-colors"
                      title="Chỉnh sửa"
                      aria-label={`Chỉnh sửa ${event.title}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-100 hover:text-rose-600 transition-colors"
                      title="Xóa"
                      aria-label={`Xóa ${event.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
