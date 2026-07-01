"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { SummaryPoint } from "../my-events-data"
import styles from "./summary.module.css"

const REVENUE_COLOR = "#a855f7"
const TICKETS_COLOR = "#10b981"

const nf = new Intl.NumberFormat("vi-VN")

/** Dual-axis line chart: revenue (left, purple) + tickets sold (right, green). */
export function SummaryChart({ data }: { data: SummaryPoint[] }) {
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(148,163,184,0.18)"
          />
          <XAxis
            dataKey="label"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={16}
          />
          <YAxis
            yAxisId="left"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v) =>
              v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}tr` : String(v)
            }
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #334155",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            formatter={(value: unknown, name) =>
              name === "Doanh thu"
                ? [`${nf.format(Number(value ?? 0))} VND`, name]
                : [nf.format(Number(value ?? 0)), name]
            }
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="Doanh thu"
            stroke={REVENUE_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="tickets"
            name="Số vé bán"
            stroke={TICKETS_COLOR}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
