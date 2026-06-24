"use client"

import {
  Users,
  CalendarDays,
  Banknote,
  TrendingUp,
  ArrowUpRight,
  MapPin,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockMetrics, mockRevenueData, mockEvents } from "@/lib/mock-data"
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils"

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "default" }> = {
  published: { label: "Đã công bố", variant: "success" },
  draft:     { label: "Bản nháp",   variant: "warning" },
  cancelled: { label: "Đã hủy",     variant: "destructive" },
  completed: { label: "Hoàn thành", variant: "default" },
}

const statCards = [
  {
    label: "Tổng doanh thu",
    value: (m: typeof mockMetrics) => formatCurrency(m.totalRevenue),
    growth: (m: typeof mockMetrics) => `+${m.revenueGrowth}%`,
    icon: Banknote,
    colorClass: "gradient-primary",
    textColor: "text-violet-700",
    bgLight: "#f5f3ff",
  },
  {
    label: "Người tham dự",
    value: (m: typeof mockMetrics) => formatNumber(m.totalAttendees),
    growth: (m: typeof mockMetrics) => `+${m.attendeeGrowth}%`,
    icon: Users,
    colorClass: "gradient-emerald",
    textColor: "text-emerald-700",
    bgLight: "#ecfdf5",
  },
  {
    label: "Sự kiện đang mở",
    value: (m: typeof mockMetrics) => String(m.activeEvents),
    growth: () => "Đang diễn ra",
    icon: CalendarDays,
    colorClass: "gradient-rose",
    textColor: "text-rose-700",
    bgLight: "#fff1f2",
  },
  {
    label: "Tổng sự kiện",
    value: (m: typeof mockMetrics) => String(m.totalEvents),
    growth: () => "Mọi thời điểm",
    icon: TrendingUp,
    colorClass: "gradient-amber",
    textColor: "text-amber-700",
    bgLight: "#fffbeb",
  },
]

export default function DashboardOverview() {
  return (
    <div className="space-y-7 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Xin chào, Admin! 👋
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Đây là tổng quan hoạt động của bạn hôm nay, {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
          </p>
        </div>
        <Button className="shrink-0 rounded-xl gap-2 shadow-sm">
          <CalendarDays className="h-4 w-4" />
          Tạo sự kiện mới
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="card-glow group relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 hover:-translate-y-0.5"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                  {card.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {card.value(mockMetrics)}
                </p>
                <span
                  className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${card.textColor}`}
                >
                  <ArrowUpRight className="h-3 w-3" />
                  {card.growth(mockMetrics)} so với tháng trước
                </span>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${card.colorClass}`}
              >
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            {/* Subtle background shape */}
            <div
              className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-10 transition-opacity group-hover:opacity-20"
              style={{ background: card.bgLight }}
            />
          </div>
        ))}
      </div>

      {/* Charts + Recent events */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Area chart */}
        <Card className="col-span-4 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Biểu đồ doanh thu</CardTitle>
            <CardDescription>Doanh thu theo từng tháng trong năm 2026 (VNĐ)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#ede9fe"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : String(v)
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: "#c4b5fd", strokeWidth: 1.5 }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e0f8",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(139,92,246,0.1)",
                    }}
                    formatter={(value: number) => [
                      `${(value / 1_000_000).toFixed(0)} triệu đồng`,
                      "Doanh thu",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)"
                    dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#6366f1" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent events */}
        <Card className="col-span-3 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Sự kiện gần đây</CardTitle>
            <CardDescription>Các sự kiện được tạo mới nhất</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockEvents.slice(0, 4).map((event, idx) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-violet-50"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold gradient-primary"
                  >
                    {event.title.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--foreground)" }}
                    >
                      {event.title}
                    </p>
                    <p
                      className="mt-0.5 flex items-center gap-1 truncate text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {event.location}
                    </p>
                  </div>
                  <Badge
                    variant={statusMap[event.status]?.variant ?? "default"}
                    className="ml-auto shrink-0 text-xs"
                  >
                    {statusMap[event.status]?.label ?? event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
