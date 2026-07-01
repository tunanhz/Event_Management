"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import styles from "./analytics.module.css"

export interface VisitPoint {
  label: string
  visits: number
}

/** Visits-over-time area chart (flat baseline while there is no traffic). */
export function VisitsChart({ data }: { data: VisitPoint[] }) {
  return (
    <div className={styles.chartWrap}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 10, left: 0 }}>
          <defs>
            <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            minTickGap={20}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #334155",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
            formatter={(value: unknown) => [String(value ?? 0), "Lượt truy cập"]}
          />
          <Area
            type="monotone"
            dataKey="visits"
            name="Lượt truy cập"
            stroke="#0891b2"
            strokeWidth={2.5}
            fill="url(#colorVisits)"
            dot={false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
