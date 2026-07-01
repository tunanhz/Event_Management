"use client"

import Link from "next/link"
import {
  Users,
  CalendarDays,
  Banknote,
  ClipboardCheck,
  ArrowUpRight,
  ArrowRight,
  Building2,
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { mockMetrics, mockRevenueData, mockModerationEvents } from "@/lib/mock-data"
import { formatCurrency, formatNumber } from "@/lib/utils"

const statCards = [
  {
    label: "Tổng người dùng",
    value: formatNumber(mockMetrics.totalUsers),
    sub: `+${mockMetrics.attendeeGrowth}% so với tháng trước`,
    icon: Users,
    colorClass: "gradient-primary",
    textColor: "text-cyan-700",
  },
  {
    label: "Tổng sự kiện",
    value: formatNumber(mockMetrics.totalEvents),
    sub: `${mockMetrics.activeEvents} đang diễn ra`,
    icon: CalendarDays,
    colorClass: "gradient-emerald",
    textColor: "text-emerald-700",
  },
  {
    label: "Doanh thu toàn hệ thống",
    value: formatCurrency(mockMetrics.totalRevenue),
    sub: `+${mockMetrics.revenueGrowth}% so với tháng trước`,
    icon: Banknote,
    colorClass: "gradient-amber",
    textColor: "text-amber-700",
  },
  {
    label: "Sự kiện chờ duyệt",
    value: String(mockMetrics.pendingApprovals),
    sub: "Cần xử lý",
    icon: ClipboardCheck,
    colorClass: "gradient-rose",
    textColor: "text-rose-700",
  },
]

export default function AdminOverview() {
  const pending = mockModerationEvents.filter((e) => e.status === "pending")

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Bảng điều khiển Quản trị
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Tổng quan hoạt động toàn hệ thống EventBox.
          </p>
        </div>
        <Link
          href="/dashboard/moderation"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700"
        >
          <ClipboardCheck className="h-4 w-4" />
          Duyệt {pending.length} sự kiện
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="card-glow group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                  {card.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                  {card.value}
                </p>
                <span className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${card.textColor}`}>
                  <ArrowUpRight className="h-3 w-3" />
                  {card.sub}
                </span>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${card.colorClass}`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + pending queue */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="col-span-4 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Doanh thu toàn hệ thống</CardTitle>
            <CardDescription>Doanh thu theo tháng trong năm 2026 (VNĐ)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : String(v))}
                  />
                  <Tooltip
                    cursor={{ stroke: "#a5f3fc", strokeWidth: 1.5 }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(8,145,178,0.12)",
                    }}
                    formatter={(value: unknown) => [
                      `${(Number(value ?? 0) / 1_000_000).toFixed(0)} triệu đồng`,
                      "Doanh thu",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0891b2"
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)"
                    dot={{ r: 3, fill: "#0891b2", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#0e7490" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending approval queue */}
        <Card className="col-span-3 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Sự kiện chờ duyệt</CardTitle>
              <CardDescription>Do Ban tổ chức gửi lên</CardDescription>
            </div>
            <Link
              href="/dashboard/moderation"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700"
            >
              Tất cả <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.slice(0, 4).map((event) => (
                <Link
                  key={event.id}
                  href="/dashboard/moderation"
                  className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-cyan-50"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl gradient-primary text-sm font-bold text-white">
                    {event.title.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {event.title}
                    </p>
                    <p
                      className="mt-0.5 flex items-center gap-1 truncate text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <Building2 className="h-3 w-3 flex-shrink-0" />
                      {event.organizer}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
