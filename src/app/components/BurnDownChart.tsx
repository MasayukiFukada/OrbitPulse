"use client";

import styles from "./BurnDownChart.module.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ChartData {
  date: string;
  ideal: number;
  actual: number;
  capacity?: number;
}

interface BurnDownChartProps {
  chartData: ChartData[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string; name: string }[];
  label?: string;
}) {
  if (!active || !payload) return null;
  const order = [
    { dataKey: "actual", name: "総Pulse", color: "#d3381c" },
    { dataKey: "ideal", name: "理想残Pulse", color: "#1e50a2" },
    { dataKey: "capacity", name: "キャパシティ", color: "#2e8b57" },
  ];
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        padding: "0.5rem",
      }}
    >
      <p style={{ margin: 0 }}>{label}</p>
      {order.map((o) => {
        const item = payload.find((p) => p.dataKey === o.dataKey);
        if (!item) return null;
        return (
          <p key={o.dataKey} style={{ margin: 0, color: o.color }}>
            {o.name}: {item.value} P
          </p>
        );
      })}
    </div>
  );
}

export default function BurnDownChart({ chartData }: BurnDownChartProps) {
  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={CustomTooltip} />
            {/* データエリア - 凡例の順序に影響されないように定義 */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#d3381c"
              fill="#d3381c"
              fillOpacity={0.3}
              name="総Pulse"
            />
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="#1e50a2"
              fill="#1e50a2"
              fillOpacity={0.3}
              name="理想残Pulse"
            />
            <Area
              type="monotone"
              dataKey="capacity"
              stroke="#2e8b57"
              fill="#2e8b57"
              fillOpacity={0.2}
              name="キャパシティ"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* カスタム凡例を固定順序（総Pulse → 理想残Pulse → キャパシティ）で表示 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: "#d3381c",
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
          <span style={{ fontSize: "0.875rem" }}>総Pulse</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: "#1e50a2",
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
          <span style={{ fontSize: "0.875rem" }}>理想残Pulse</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 14,
              height: 14,
              backgroundColor: "#2e8b57",
              borderRadius: 2,
              opacity: 0.7,
            }}
          />
          <span style={{ fontSize: "0.875rem" }}>キャパシティ</span>
        </div>
      </div>
    </div>
  );
}
