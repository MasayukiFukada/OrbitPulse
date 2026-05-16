import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbTodoTaskRepository } from "@/infrastructure/repositories/LowDbTodoTaskRepository";
import { LowDbCapacityRepository } from "@/infrastructure/repositories/LowDbCapacityRepository";
import { LowDbBurnDownSnapshotRepository } from "@/infrastructure/repositories/LowDbBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import BurnDownChart from "@/app/[locale]/components/BurnDownChart";
import { generateBurnDownChartData } from "@/app/[locale]/components/chartUtils";
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
  const { totalEstPulse, plannedActualPulse } = await sprintUseCase.getSprintPulseStats(activeSprint.id);

  // チャートデータ生成
  const chartData = generateBurnDownChartData({
    sprint: activeSprint,
    capacities,
    snapshots,
    totalEstPulse,
    plannedActualPulse,
    velocity,
  });

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
