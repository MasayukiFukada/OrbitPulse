import { RecurringTask } from "@/domain/entities/RecurringTask";
import { Category } from "@/domain/entities/Category";

const CHART_TIME_ZONE = "Asia/Tokyo";

export interface ChartData {
  date: string;
  ideal: number | null;
  actual: number | null;
  capacity?: number;
  velocity?: number | null;
}

export interface CapacityInfo {
  date: string | Date;
  pulseCount: number;
}

export interface SnapshotInfo {
  date: string | Date;
  remainingPulse: number;
}

export interface SprintInfo {
  startDate: string | Date;
  endDate: string | Date;
}

/**
 * カレンダー日をタイムゾーン固定で YYYY-MM-DD にする（サーバー/クライアントで一致させる）
 */
export function toDateKey(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHART_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/**
 * 日付フォーマット関数 (MM/DD) — チャート軸・マップ用
 */
export const formatDate = (date: Date | string) => {
  const [, month, day] = toDateKey(date).split("-");
  return `${month}/${day}`;
};

export function addCalendarDays(date: Date | string, days: number): Date {
  const [y, m, d] = toDateKey(date).split("-").map(Number);
  // 日本時間の正午を基準に日付を進める（DSTなし）
  return new Date(Date.UTC(y, m - 1, d + days, 3, 0, 0));
}

/**
 * バーンダウンチャート用のデータを生成する
 */
export function generateBurnDownChartData(params: {
  sprint: {
    startDate: Date | string;
    endDate: Date | string;
    days: {
      date: Date | string;
      capacity: number;
      remaining: number | null;
      note: string | null;
    }[];
  };
  totalEstPulse: number;
  today?: Date;
}): ChartData[] {
  const { sprint, totalEstPulse } = params;
  const chartData: ChartData[] = [];

  const tDate = params.today || new Date();
  const todayStr = toDateKey(tDate);

  // 1. スプリントの総キャパシティを算出
  const totalCapacity = sprint.days.reduce((sum, d) => sum + d.capacity, 0);

  let accumulatedCapacity = 0;
  let prevActualRemaining = totalEstPulse;

  // days を日付順にソート
  const sortedDays = [...sprint.days].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const day of sortedDays) {
    const dayDateKey = toDateKey(day.date);
    const dayLabel = formatDate(day.date);

    // 累積キャパシティの加算
    accumulatedCapacity += day.capacity;

    // 理想線 (Ideal)
    const idealValue = totalCapacity > 0
      ? Math.max(0, totalEstPulse * (1 - accumulatedCapacity / totalCapacity))
      : totalEstPulse;

    // 実績線 (Actual)
    let actualValue: number | null = null;

    if (dayDateKey <= todayStr) {
      if (day.remaining !== null && day.remaining !== undefined) {
        actualValue = day.remaining;
        prevActualRemaining = day.remaining;
      } else {
        // 開かなかった日の補完: 直前の実績を引き継ぐ
        actualValue = prevActualRemaining;
      }
    }

    chartData.push({
      date: dayLabel,
      ideal: idealValue,
      actual: actualValue,
      capacity: Math.max(0, totalCapacity - accumulatedCapacity),
    });
  }

  return chartData;
}

export interface RecurringChartDayData {
  date: string;
  dateKey: string;
  [categoryId: string]: number | string;
}

export function generateRecurringChartData(
  recurringTasks: RecurringTask[],
  categories: Category[],
  today: Date = new Date()
): {
  chartData: RecurringChartDayData[];
  categories: { id: string; name: string; color: string }[];
} {
  const chartData: RecurringChartDayData[] = [];
  
  for (let i = 0; i < 14; i++) {
    const targetDate = addCalendarDays(today, i);
    const dateKey = toDateKey(targetDate);
    const label = formatDate(targetDate);
    
    const dayOfWeek = (targetDate.getDay() === 0 ? 7 : targetDate.getDay()).toString();
    const dayOfMonth = targetDate.getDate().toString();
    
    const dayData: RecurringChartDayData = {
      date: label,
      dateKey: dateKey,
    };
    
    for (const cat of categories) {
      dayData[cat.id] = 0;
    }
    
    for (const task of recurringTasks) {
      let matches = false;
      if (task.pattern === "daily") {
        matches = true;
      } else if (task.pattern === "weekly") {
        const days = task.patternValue.split(",");
        if (days.includes(dayOfWeek)) {
          matches = true;
        }
      } else if (task.pattern === "monthly") {
        const days = task.patternValue.split(",");
        if (days.includes(dayOfMonth)) {
          matches = true;
        }
      }
      
      if (matches) {
        dayData[task.categoryId] = (dayData[task.categoryId] as number) + 1;
      }
    }
    
    chartData.push(dayData);
  }
  
  return {
    chartData,
    categories: categories.map(c => ({ id: c.id, name: c.name, color: c.color })),
  };
}


