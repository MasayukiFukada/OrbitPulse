import { SqliteSprintRepository } from "@/infrastructure/repositories/SqliteSprintRepository";
import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { SqliteTaskRepository } from "@/infrastructure/repositories/SqliteTaskRepository";
import { SqliteTodoTaskRepository } from "@/infrastructure/repositories/SqliteTodoTaskRepository";
import { SqliteCapacityRepository } from "@/infrastructure/repositories/SqliteCapacityRepository";
import { SqliteBurnDownSnapshotRepository } from "@/infrastructure/repositories/SqliteBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import BurnDownChart, {
  ChartData,
} from "@/app/[locale]/components/BurnDownChart";
import Image from "next/image";
import { PomodoroProvider } from "./sprints/[id]/PomodoroContext";
import PomodoroStatusDisplay from "./sprints/[id]/PomodoroStatusDisplay";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("dashboard");

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
          <p>{t("noActiveSprint")}</p>
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
  const chartData: ChartData[] = [];
  let usedCapacity = 0;
  const currentDate = new Date(activeSprint.startDate);
  const endDate = new Date(activeSprint.endDate);

  // 現在の残り作業量を取得
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDate(today);
  let idealStarted = false;
  let remainingWork = totalPulse;

  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    const dayCapacity = capacityMap[dateStr] || 0;
    const remainingCapacity = Math.max(0, totalCapacity - usedCapacity);

    // 理想線：今日から開始し、明日以降のキャパシティ通りに消化した場合を計算
    let idealValue = null;
    if (!idealStarted && dateStr >= todayStr) {
      idealStarted = true;
      // 現在の残り作業量を設定（最新のスナップショットがあればそれを使う）
      const latestSnapshot = [...snapshots].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];
      remainingWork = latestSnapshot
        ? latestSnapshot.remainingPulse
        : totalPulse;
      idealValue = remainingWork; // 今日の時点での残り作業量を表示
    }

    if (idealStarted && dateStr > todayStr) {
      // 明日以降：実際のキャパシティ通りに減算（整数）
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
        <h2>{t("currentSprint", { name: activeSprint.name })}</h2>
        <BurnDownChart chartData={chartData} />
      </main>
    </PomodoroProvider>
  );
}
