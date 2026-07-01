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
  sprint: SprintInfo;
  capacities: CapacityInfo[];
  snapshots: SnapshotInfo[];
  totalEstPulse: number;
  plannedActualPulse: number;
  velocity: number;
}): ChartData[] {
  const {
    sprint,
    capacities,
    snapshots,
    totalEstPulse,
    plannedActualPulse,
    velocity,
  } = params;

  const chartData: ChartData[] = [];

  // 総予定Pulse: 最初のスナップショット残量 + 完了分の見積（スプリント開始時点の規模）
  let totalPulse: number;
  if (snapshots && snapshots.length > 0) {
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    totalPulse =
      sortedSnapshots[0].remainingPulse + plannedActualPulse;
  } else {
    totalPulse = totalEstPulse;
  }

  const capacityMap: { [key: string]: number } = {};
  capacities.forEach((c) => {
    const dateStr = formatDate(c.date);
    capacityMap[dateStr] = (capacityMap[dateStr] || 0) + c.pulseCount;
  });

  let totalCapacity = 0;
  Object.values(capacityMap).forEach((v) => (totalCapacity += v));

  const snapshotMap: { [key: string]: number } = {};
  (snapshots || []).forEach((s) => {
    const dateStr = formatDate(s.date);
    snapshotMap[dateStr] = s.remainingPulse;
  });

  let usedCapacity = 0;
  let currentDate = new Date(sprint.startDate);
  const endDateKey = toDateKey(sprint.endDate);
  const todayStr = formatDate(new Date());

  let idealStarted = false;
  let remainingWork = totalPulse;

  while (toDateKey(currentDate) <= endDateKey) {
    const dateStr = formatDate(currentDate);
    const dayCapacity = capacityMap[dateStr] || 0;
    const remainingCapacity = Math.max(0, totalCapacity - usedCapacity);

    let idealValue: number | null = null;
    if (!idealStarted && dateStr >= todayStr) {
      idealStarted = true;
      const latestSnapshot = [...(snapshots || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];
      remainingWork = latestSnapshot
        ? latestSnapshot.remainingPulse
        : totalPulse;
      idealValue = remainingWork;
    }

    if (idealStarted && dateStr > todayStr) {
      const dailyDecrease = Math.min(dayCapacity, remainingWork);
      remainingWork = Math.max(0, remainingWork - dailyDecrease);
      idealValue = remainingWork;
    }

    const actual =
      snapshotMap[dateStr] !== undefined ? snapshotMap[dateStr] : null;

    chartData.push({
      date: dateStr,
      ideal: idealValue,
      actual: actual,
      capacity: remainingCapacity,
      velocity: dateStr <= todayStr ? velocity : null,
    });

    usedCapacity += dayCapacity;
    currentDate = addCalendarDays(currentDate, 1);
  }

  return chartData;
}
