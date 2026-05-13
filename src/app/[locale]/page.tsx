import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbTodoTaskRepository } from "@/infrastructure/repositories/LowDbTodoTaskRepository";
import { LowDbCapacityRepository } from "@/infrastructure/repositories/LowDbCapacityRepository";
import { LowDbBurnDownSnapshotRepository } from "@/infrastructure/repositories/LowDbBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import BurnDownChart, {
  ChartData,
} from "@/app/[locale]/components/BurnDownChart";
import Image from "next/image";
import { PomodoroProvider } from "./sprints/[id]/PomodoroContext";
import PomodoroStatusDisplay from "./sprints/[id]/PomodoroStatusDisplay";
import { getTranslations } from "next-intl/server";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sprintRepo = new LowDbSprintRepository();
  const capacityRepo = new LowDbCapacityRepository();
  const backlogRepoForSprint = new LowDbBacklogRepository();
  const burnDownSnapshotRepo = new LowDbBurnDownSnapshotRepository();
  const taskRepo = new LowDbTaskRepository();
  const todoTaskRepo = new LowDbTodoTaskRepository();

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
  const locale = await getLocale();

  if (!activeSprint) {
    return (
      <PomodoroProvider>
        <div className={styles.container}>
          <PomodoroStatusDisplay />
          <div className={styles.hero}>
            <div className={styles.logoWrapper}>
              <Image
                src="/images/OrbitPulse_Logo.png"
                alt="OrbitPulse Logo"
                width={120}
                height={120}
                priority
              />
            </div>
            <h1 className={styles.brandName}>
              <span className={styles.brandOrbit}>Orbit</span>
              <span className={styles.brandPulse}>Pulse</span>
            </h1>
          </div>
          <div className={styles.noSprint}>
            <p>{t("noActiveSprint")}</p>
            <Link href={`/${locale}/sprints`} className={styles.createButton}>
              Go to Sprints
            </Link>
          </div>
        </div>
      </PomodoroProvider>
    );
  }

  // 当日のスナップショットを記録（まだなければ）
  await sprintUseCase.fillMissingSnapshots(activeSprint.id);
  await sprintUseCase.takeSnapshot(activeSprint.id);

  // キャパシティとスナップショットを取得
  const capacities = await sprintUseCase.getCapacities(activeSprint.id);
  const snapshots = await sprintUseCase.getSnapshots(activeSprint.id);
  const velocity = await sprintUseCase.calculateVelocity(activeSprint.id);

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
      velocity: dateStr <= todayStr ? velocity : null,
    });

    usedCapacity += dayCapacity;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return (
    <PomodoroProvider>
      <div className={styles.container}>
        <PomodoroStatusDisplay />
        <div className={styles.hero}>
          <div className={styles.logoWrapper}>
            <Image
              src="/images/OrbitPulse_Logo.png"
              alt="OrbitPulse Logo"
              width={100}
              height={100}
              priority
            />
          </div>
          <h1 className={styles.brandName}>
            <span className={styles.brandOrbit}>Orbit</span>
            <span className={styles.brandPulse}>Pulse</span>
          </h1>
        </div>
        
        <section className={styles.sprintSection}>
          <h2 className={styles.sprintTitle}>
            {t.rich("currentSprint", {
              name: activeSprint.name,
              link: (chunks) => (
                <Link
                  href={`/${locale}/sprints/${activeSprint.id}`}
                  className={styles.sprintLink}
                >
                  {chunks}
                </Link>
              ),
            })}
          </h2>
          <div className={styles.velocityInfo}>
            {t("velocity", { value: velocity })}
          </div>
          <BurnDownChart chartData={chartData} />
        </section>
      </div>
    </PomodoroProvider>
  );
}
