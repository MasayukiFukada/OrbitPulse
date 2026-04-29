"use client";

import styles from "./BurnDownChart.module.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ChartData {
  date: string;
  ideal: number;
  actual: number;
}

interface BurnDownChartProps {
  chartData: ChartData[];
  totalPulse: number;
}

export default function BurnDownChart({ chartData, totalPulse }: BurnDownChartProps) {
  return (
    <div className={styles.container}>
      <div>
        <h3>バーンダウンチャート (Pulse)</h3>
        <p>総予定Pulse: {totalPulse} P</p>
      </div>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="ideal" 
              stroke="#1e50a2" 
              fill="#1e50a2" 
              fillOpacity={0.3}
              name="理想線 (予定キャパシティ)" 
            />
            <Area 
              type="monotone" 
              dataKey="actual" 
              stroke="#d3381c" 
              fill="#d3381c" 
              fillOpacity={0.3}
              name="実績 (残りPulse)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
