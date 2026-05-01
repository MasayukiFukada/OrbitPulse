import { SqliteSprintRepository } from "@/infrastructure/repositories/SqliteSprintRepository";
import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { SqliteTaskRepository } from "@/infrastructure/repositories/SqliteTaskRepository";
import { SqliteTodoTaskRepository } from "@/infrastructure/repositories/SqliteTodoTaskRepository";
import { SqliteCapacityRepository } from "@/infrastructure/repositories/SqliteCapacityRepository";
import { SqliteBurnDownSnapshotRepository } from "@/infrastructure/repositories/SqliteBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import BurnDownChart from "@/app/components/BurnDownChart";
import Image from "next/image";
import { PomodoroProvider } from "./sprints/[id]/PomodoroContext";
import PomodoroStatusDisplay from "./sprints/[id]/PomodoroStatusDisplay";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sprintRepo = new SqliteSprintRepository();
  const capacityRepo = new SqliteCapacityRepository();
  const backlogRepoForSprint = new SqliteBacklogRepository();
  const burnDownSnapshotRepo = new SqliteBurnDownSnapshotRepository();
  const taskRepo = new SqliteTaskRepository();
  const todoTaskRepo = new SqliteTodoTaskRepository();

  const sprintUseCase = new ManageSprintUseCase(
    sprintRepo,
    capacityRepo,
    backlogRepoForSprint,
    burnDownSnapshotRepo,
    taskRepo,
    todoTaskRepo,
  );

  const sprints = await sprintUseCase.getSprints();
  const activeSprint = sprints.find((s) => s.status === "active");

  if (!activeSprint) {
    return (
      <PomodoroProvider>
        <main
          style={{
            padding: "2rem",
            fontFamily: "sans-serif",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <PomodoroStatusDisplay />
          <p>
            アクティブなスプリントがありません。スプリントを開始してください。
          </p>
        </main>
      </PomodoroProvider>
    );
  }

  // 当日のスナップショットを記録（まだなければ）
  await sprintUseCase.fillMissingSnapshots(activeSprint.id);
  await sprintUseCase.takeSnapshot(activeSprint.id);

  // キャパシティとスナップショットを取得
  const capacities = await sprintUseCase.getCapacities(activeSprint.id);
  const snapshots = await sprintUseCase.getSnapshots(activeSprint.id);

  // 日付フォーマット関数 (MM/DD)
  const formatDate = (date: Date) => {
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${m}/${d}`;
  };

  // 総予定Pulse
  const totalPulse = capacities.reduce((sum, c) => sum + c.pulseCount, 0);

  // キャパシティマップ（日付文字列 → パルス数）
  const capacityMap: { [key: string]: number } = {};
  capacities.forEach((c) => {
    const dateStr = formatDate(new Date(c.date));
    capacityMap[dateStr] = (capacityMap[dateStr] || 0) + c.pulseCount;
  });

  // スナップショットマップ（日付文字列 → 残りPulse）
  const snapshotMap: { [key: string]: number } = {};
  snapshots.forEach((s) => {
    const dateStr = formatDate(new Date(s.date));
    snapshotMap[dateStr] = s.remainingPulse;
  });

  // 総キャパシティを計算
  let totalCapacity = 0;
  Object.values(capacityMap).forEach((v) => (totalCapacity += v));

  // チャートデータ生成
  type ChartDataItem = {
    date: string;
    ideal: number;
    actual: number | null;
    capacity: number;
  };
  const chartData: ChartDataItem[] = [];
  let idealRemaining = totalPulse;
  let usedCapacity = 0;
  const currentDate = new Date(activeSprint.startDate);
  const endDate = new Date(activeSprint.endDate);

  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const dayCapacity = capacityMap[dateStr] || 0;
    const remainingCapacity = Math.max(0, totalCapacity - usedCapacity);
    idealRemaining = Math.max(0, idealRemaining - dayCapacity);

    const actual =
      snapshotMap[dateStr] !== undefined ? snapshotMap[dateStr] : null;

    chartData.push({
      date: dateStr,
      ideal: idealRemaining,
      actual: actual,
      capacity: remainingCapacity,
    });

    usedCapacity += dayCapacity;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return (
    <PomodoroProvider>
      <main
        style={{
          padding: "2rem",
          fontFamily: "var(--font-geist-sans), sans-serif",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <PomodoroStatusDisplay />
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <Image
              src="/images/OrbitPulse_Logo.png"
              alt="OrbitPulse Logo"
              width={100}
              height={100}
              priority
            />
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: 900,
                fontFamily: "var(--font-geist-sans), sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              <span style={{ color: "#113764" }}>Orbit</span>
              <span style={{ color: "#16ADB4" }}>Pulse</span>
            </span>
          </div>
        </div>
        <h2>現在のスプリント: {activeSprint.name}</h2>
        <BurnDownChart chartData={chartData} />
      </main>
    </PomodoroProvider>
  );
}
