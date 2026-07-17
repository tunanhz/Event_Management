"use client"

import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { fetchDashboardReports, type DashboardReports } from "@/lib/finance-api"
import { formatCurrency, formatNumber } from "@/lib/utils"

const PIE_COLORS = ["#0891b2", "#22d3ee", "#34d399", "#fbbf24", "#fb7185"]

export default function ReportsPage() {
  const [reports, setReports] = useState<DashboardReports | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDashboardReports()
      .then(setReports)
      .catch((err) => setError(err.message ?? "Không thể tải báo cáo phân tích"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !reports) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center mx-auto max-w-xl">
        <p className="font-semibold text-destructive">{error || "Lỗi tải báo cáo phân tích"}</p>
      </div>
    )
  }

  const topEvents = reports.topEvents

  return (
    <div className="space-y-7 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Báo cáo &amp; Thống kê</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phân tích doanh thu, thể loại và hiệu quả sự kiện thực tế trên toàn hệ thống.
        </p>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Revenue bar chart */}
        <Card className="col-span-4 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Doanh thu theo tháng</CardTitle>
            <CardDescription>Năm 2026 (triệu VNĐ)</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reports.monthlyRevenue}>
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
                    cursor={{ fill: "rgba(8,145,178,0.08)" }}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e2e8f0",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(value: unknown) => [
                      `${(Number(value ?? 0) / 1_000_000).toFixed(0)} triệu đồng`,
                      "Doanh thu",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#0891b2" radius={[6, 6, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card className="col-span-3 rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Sự kiện theo thể loại</CardTitle>
            <CardDescription>Phân bố toàn hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reports.categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {reports.categoryData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", fontSize: "12px", borderColor: "#e2e8f0" }}
                    formatter={(value: unknown) => [`${String(value)} sự kiện`, "Số lượng"]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top events table */}
      <Card className="rounded-2xl border card-glow" style={{ borderColor: "var(--border)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Sự kiện doanh thu cao nhất</CardTitle>
          <CardDescription>Xếp hạng theo doanh thu thực tế từ bán vé</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-y border-border bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Sự kiện</th>
                  <th className="px-6 py-3">Vé đã bán / Sức chứa</th>
                  <th className="px-6 py-3 text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {topEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Chưa ghi nhận doanh thu từ sự kiện nào.
                    </td>
                  </tr>
                ) : (
                  topEvents.map((event, i) => (
                    <tr key={event.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.location}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatNumber(event.ticketsSold)} / {formatNumber(event.capacity)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground">
                        {formatCurrency(event.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
