import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbRecurringTaskRepository } from "@/infrastructure/repositories/LowDbRecurringTaskRepository";
import { LowDbCategoryRepository } from "@/infrastructure/repositories/LowDbCategoryRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import BurnDownChart from "@/app/[locale]/components/BurnDownChart";
import RecurringScheduleChart from "@/app/[locale]/components/RecurringScheduleChart";
import { generateBurnDownChartData, generateRecurringChartData } from "@/app/[locale]/components/chartUtils";
import Image from "next/image";

import { getTranslations } from "next-intl/server";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { getLocale } from "next-intl/server";


export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sprintRepo = new LowDbSprintRepository();
  const backlogRepoForSprint = new LowDbBacklogRepository();
  const taskRepo = new LowDbTaskRepository();
  const recurringRepo = new LowDbRecurringTaskRepository();
  const categoryRepo = new LowDbCategoryRepository();

  const sprintUseCase = new ManageSprintUseCase(
    sprintRepo,
    backlogRepoForSprint,
    taskRepo,
  );

  const sprints = await sprintUseCase.getSprints();
  const activeSprint = sprints.find((s) => s.status === "active");
  const t = await getTranslations("dashboard");
  const locale = await getLocale();

  // 繰り返しタスクデータの生成
  const recurringTasks = await recurringRepo.findAll();
  const categories = await categoryRepo.findAll();
  const { chartData: recurringChartData, categories: serializedCategories } = generateRecurringChartData(
    recurringTasks,
    categories
  );

  if (!activeSprint) {
    return (
      <div className={styles.container}>
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
        <RecurringScheduleChart 
          chartData={recurringChartData}
          categories={serializedCategories}
        />
      </div>
    );
  }

  // 当日のスナップショットを記録（まだなければ）
  await sprintUseCase.fillMissingSnapshots(activeSprint.id);
  await sprintUseCase.takeSnapshot(activeSprint.id);

  // 再読み込みして最新のスナップショット状態を反映
  const updatedActiveSprint = await sprintUseCase.getSprintById(activeSprint.id);
  if (!updatedActiveSprint) return null;

  const velocity = await sprintUseCase.calculateVelocity(updatedActiveSprint.id);
  const { totalEstPulse } = await sprintUseCase.getSprintPulseStats(updatedActiveSprint.id);

  // チャートデータ生成
  const chartData = generateBurnDownChartData({
    sprint: updatedActiveSprint,
    totalEstPulse,
  });

  return (
    <div className={styles.container}>
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
            name: updatedActiveSprint.name,
            link: (chunks) => (
              <Link
                href={`/${locale}/sprints/${updatedActiveSprint.id}`}
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

      <RecurringScheduleChart 
        chartData={recurringChartData}
        categories={serializedCategories}
      />
    </div>
  );
}

