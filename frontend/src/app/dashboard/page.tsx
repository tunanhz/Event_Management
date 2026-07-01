"use client"

import Link from "next/link"
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { mockMetrics, mockRevenueData, mockEvents } from "@/lib/mock-data"
import { formatCurrency, formatNumber, formatDateTime } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"

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
    textColor: "text-cyan-700",
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
  const { user } = useAuth()
  const welcomeName = user ? user.fullName : "Bạn"
  const userRole = user?.role || "ORGANIZER"

  // Define role specific contents
  const getRoleConfigs = (role: string) => {
    switch (role) {
      case "ADMIN":
        return {
          title: "Tổng quan Hệ thống (Admin)",
          sub: "Quản trị và giám sát toàn bộ hoạt động của nền tảng EventBox.",
          actionText: "Quản lý tài khoản",
          actionHref: "/dashboard/accounts",
          kpi: [
            {
              label: "Tổng doanh thu hệ thống",
              value: formatCurrency(2450000000),
              growth: "+18.2% so với tháng trước",
              icon: Banknote,
              colorClass: "gradient-primary",
              textColor: "text-cyan-700",
              bgLight: "#f5f3ff",
            },
            {
              label: "Tổng người tham gia",
              value: formatNumber(48290),
              growth: "+12.5% so với tháng trước",
              icon: Users,
              colorClass: "gradient-emerald",
              textColor: "text-emerald-700",
              bgLight: "#ecfdf5",
            },
            {
              label: "Nhà tổ chức hoạt động",
              value: "324",
              growth: "+8.4% so với tháng trước",
              icon: CalendarDays,
              colorClass: "gradient-rose",
              textColor: "text-rose-700",
              bgLight: "#fff1f2",
            },
            {
              label: "Tổng sự kiện toàn sàn",
              value: "1,204",
              growth: "Mọi thời điểm",
              icon: TrendingUp,
              colorClass: "gradient-amber",
              textColor: "text-amber-700",
              bgLight: "#fffbeb",
            },
          ],
          chartTitle: "Biểu đồ doanh thu toàn hệ thống",
          recentTitle: "Sự kiện vừa tạo",
          recentSub: "Các sự kiện mới nhất trên hệ thống",
          eventsToShow: mockEvents.slice(0, 4)
        };
      case "STAFF":
        return {
          title: "Khu vực làm việc (Staff)",
          sub: "Xem và phê duyệt các sự kiện mới đăng ký trên hệ thống.",
          actionText: "Duyệt sự kiện",
          actionHref: "/dashboard/events",
          kpi: [
            {
              label: "Sự kiện chờ duyệt",
              value: "8",
              growth: "Cần xử lý ngay",
              icon: CalendarDays,
              colorClass: "gradient-rose",
              textColor: "text-rose-700",
              bgLight: "#fff1f2",
            },
            {
              label: "Sự kiện đã duyệt",
              value: "312",
              growth: "Trong tháng này",
              icon: TrendingUp,
              colorClass: "gradient-emerald",
              textColor: "text-emerald-700",
              bgLight: "#ecfdf5",
            },
            {
              label: "Tài khoản hoạt động",
              value: "1,452",
              growth: "Đã xác minh",
              icon: Users,
              colorClass: "gradient-primary",
              textColor: "text-cyan-700",
              bgLight: "#f5f3ff",
            },
            {
              label: "Sự kiện đang diễn ra",
              value: "124",
              growth: "Mọi thời điểm",
              icon: Banknote,
              colorClass: "gradient-amber",
              textColor: "text-amber-700",
              bgLight: "#fffbeb",
            },
          ],
          chartTitle: "Biểu đồ sự kiện được duyệt theo tháng",
          recentTitle: "Sự kiện chờ duyệt",
          recentSub: "Danh sách yêu cầu phê duyệt mới nhất",
          eventsToShow: mockEvents.filter(e => e.status === "draft").slice(0, 4)
        };
      case "ORGANIZER":
      default:
        return {
          title: "Tổng quan hoạt động (Organizer)",
          sub: "Quản lý các sự kiện và theo dõi doanh số bán vé của riêng bạn.",
          actionText: "Tạo sự kiện mới",
          actionHref: "/dashboard/events",
          kpi: [
            {
              label: "Tổng doanh thu bán vé",
              value: formatCurrency(mockMetrics.totalRevenue),
              growth: `+${mockMetrics.revenueGrowth}% so với tháng trước`,
              icon: Banknote,
              colorClass: "gradient-primary",
              textColor: "text-cyan-700",
              bgLight: "#f5f3ff",
            },
            {
              label: "Người mua vé của tôi",
              value: formatNumber(mockMetrics.totalAttendees),
              growth: `+${mockMetrics.attendeeGrowth}% so với tháng trước`,
              icon: Users,
              colorClass: "gradient-emerald",
              textColor: "text-emerald-700",
              bgLight: "#ecfdf5",
            },
            {
              label: "Sự kiện đang mở",
              value: String(mockMetrics.activeEvents),
              growth: "Đang diễn ra",
              icon: CalendarDays,
              colorClass: "gradient-rose",
              textColor: "text-rose-700",
              bgLight: "#fff1f2",
            },
            {
              label: "Tổng sự kiện của tôi",
              value: String(mockMetrics.totalEvents),
              growth: "Mọi thời điểm",
              icon: TrendingUp,
              colorClass: "gradient-amber",
              textColor: "text-amber-700",
              bgLight: "#fffbeb",
            },
          ],
          chartTitle: "Biểu đồ doanh thu bán vé",
          recentTitle: "Sự kiện của tôi",
          recentSub: "Các sự kiện bạn đã tạo gần đây",
          eventsToShow: mockEvents.slice(0, 4)
        };
    }
  };

  const config = getRoleConfigs(userRole);

  return (
    <div className="space-y-7 animate-fade-up">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Xin chào, {welcomeName}! 👋
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            {config.sub}
          </p>
        </div>
        <Link href={config.actionHref}>
          <Button className="shrink-0 rounded-xl gap-2 shadow-sm cursor-pointer">
            <CalendarDays className="h-4 w-4" />
            {config.actionText}
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.kpi.map((card) => (
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
                <span
                  className={`mt-1 inline-flex items-center gap-0.5 text-xs font-medium ${card.textColor}`}
                >
                  <ArrowUpRight className="h-3 w-3" />
                  {card.growth}
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
            <CardTitle className="text-base font-semibold">{config.chartTitle}</CardTitle>
            <CardDescription>Doanh số thống kê theo từng tháng trong năm 2026 (VNĐ)</CardDescription>
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
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
                    cursor={{ stroke: "#a5f3fc", strokeWidth: 1.5 }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 16px rgba(8,145,178,0.12)",
                    }}
                    formatter={(value: any) => [
                      `${(Number(value || 0) / 1_000_000).toFixed(0)} triệu đồng`,
                      "Doanh số",
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

        {/* Recent events */}
        <Card className="col-span-3 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{config.recentTitle}</CardTitle>
            <CardDescription>{config.recentSub}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.eventsToShow.length > 0 ? (
                config.eventsToShow.map((event, idx) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-cyan-50"
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
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Không có sự kiện nào hiển thị
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
