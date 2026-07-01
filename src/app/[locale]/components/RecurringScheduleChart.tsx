"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import styles from "./RecurringScheduleChart.module.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RecurringCategory {
  id: string;
  name: string;
  color: string;
}

interface RecurringChartDayData {
  date: string;
  dateKey: string;
  [categoryId: string]: number | string;
}

interface RecurringScheduleChartProps {
  chartData: RecurringChartDayData[];
  categories: RecurringCategory[];
}

export default function RecurringScheduleChart({
  chartData,
  categories,
}: RecurringScheduleChartProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // カスタムツールチップ
  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;
    
    // 各項目の本来の値を抽出
    const items = payload.map((entry: any) => {
      const val = Number(entry.payload[entry.dataKey]) || 0;
      return {
        key: entry.dataKey,
        name: entry.name,
        color: entry.color,
        value: val,
      };
    }).filter((item: any) => item.value > 0);

    if (items.length === 0) return null;

    // 合計値の計算
    const total = items.reduce((sum: number, item: any) => sum + item.value, 0);

    return (
      <div className={styles.tooltipContainer}>
        <p className={styles.tooltipLabel}>{label}</p>
        <div className={styles.tooltipDivider} />
        {items.map((item: any) => (
          <p key={item.key} style={{ margin: 0, color: item.color, fontSize: "0.875rem" }}>
            {item.name}: {t("taskCount", { count: item.value })}
          </p>
        ))}
        {items.length > 0 && (
          <>
            <div className={styles.tooltipDivider} />
            <p className={styles.tooltipTotal}>
              {t("chartTotal")}: {t("taskCount", { count: total })}
            </p>
          </>
        )}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>{t("recurringChartTitle")}</h3>
        <div className={styles.chartWrapper} style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {tCommon("loading")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>{t("recurringChartTitle")}</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: "var(--text-main)", opacity: 0.7, fontSize: 12 }}
              axisLine={{ stroke: "var(--border-color)" }}
            />
            <YAxis 
              tick={{ fill: "var(--text-main)", opacity: 0.7, fontSize: 12 }}
              axisLine={{ stroke: "var(--border-color)" }}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
            {categories.map((cat) => (
              <Bar
                key={cat.id}
                dataKey={cat.id}
                name={cat.name}
                stackId="a"
                fill={cat.color}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 凡例 */}
      <div className={styles.legendContainer}>
        {categories.map((cat) => (
          <div key={cat.id} className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ backgroundColor: cat.color }}
            />
            <span className={styles.legendText}>{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
