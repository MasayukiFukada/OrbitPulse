import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbRecurringTaskRepository } from "@/infrastructure/repositories/LowDbRecurringTaskRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { ManageRecurringTaskUseCase } from "@/application/use-cases/ManageRecurringTaskUseCase";
import PlanningBoard from "./PlanningBoard";
import { generateBurnDownChartData } from "@/app/[locale]/components/chartUtils";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  console.log("SprintDetailPage: locale =", locale, "id =", id);
  setRequestLocale(locale);

  const sprintRepository = new LowDbSprintRepository();
  const backlogRepository = new LowDbBacklogRepository();
  const taskRepository = new LowDbTaskRepository();

  const sprintUseCase = new ManageSprintUseCase(
    sprintRepository,
    backlogRepository,
    taskRepository,
  );
  const backlogUseCase = new ManageBacklogUseCase(backlogRepository, taskRepository);
  const taskUseCase = new ManageTaskUseCase(taskRepository);

  const sprint = await sprintUseCase.getSprintById(id);
  if (!sprint) notFound();

  // 今日の繰り返しタスクを自動生成する（スプリントがアクティブならスプリントIDに紐付け、計画中や完了ならプールに投げる）
  const recurringTaskRepository = new LowDbRecurringTaskRepository();
  const recurringUseCase = new ManageRecurringTaskUseCase(
    recurringTaskRepository,
    taskRepository
  );
  await recurringUseCase.generateTasksForDate(
    new Date(),
    sprint.status === "active" ? id : null
  );

  // スナップショットを自動記録（過去の日付も含めて）
  await sprintUseCase.fillMissingSnapshots(id);
  await sprintUseCase.takeSnapshot(id);

  // 再取得して最新のスナップショット状態を反映
  const updatedSprint = await sprintUseCase.getSprintById(id);
  if (!updatedSprint) notFound();

  const velocity = await sprintUseCase.calculateVelocity(id);
  const sprintItems = await sprintUseCase.getItemsInSprint(id);
  const allBacklogItems = await backlogUseCase.getBacklogItems();
  
  // 単発タスクは、スプリント紐づくタスクの中で backlogItemId が null のもの
  const allSprintTasks = await taskUseCase.getSprintTasks(id);
  const todoTasks = allSprintTasks.filter((t) => t.backlogItemId === null);
  
  const pulseStats = await sprintUseCase.getSprintPulseStats(id);

  const chartData = generateBurnDownChartData({
    sprint: updatedSprint,
    totalEstPulse: pulseStats.totalEstPulse,
  });

  // 各アイテムのタスクを取得
  const sprintItemsWithTasks = await Promise.all(
    sprintItems.map(async (item) => {
      const tasks = await taskUseCase.getTasksByBacklogItem(item.id);
      return {
        ...item,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          estimatedPulse: t.estimatedPulse,
          actualPulse: t.actualPulse,
          remainingPulse: t.remainingPulse, // 残見積を追加
        })),
      };
    }),
  );

  // 完了していないスプリントのIDを取得
  const allSprints = await sprintUseCase.getSprints();
  const activeOrPlanningSprintIds = new Set(
    allSprints
      .filter((s) => s.status !== "completed")
      .map((s) => s.id),
  );

  // 他の進行中/計画中スプリントに紐付いていないバックログアイテムを抽出
  const availableItems = allBacklogItems.filter(
    (item) => !item.sprintId || !activeOrPlanningSprintIds.has(item.sprintId),
  );

  // シリアライズ可能な形式に変換
  const plainSprint = {
    id: updatedSprint.id,
    name: updatedSprint.name,
    startDate: updatedSprint.startDate,
    endDate: updatedSprint.endDate,
    goal: updatedSprint.goal,
    status: updatedSprint.status,
    days: updatedSprint.days.map((d) => ({
      date: d.date,
      capacity: d.capacity,
      remaining: d.remaining,
      note: d.note,
    })),
  };

  // 既存 UI (PlanningBoard) との互換性のためのマッピング
  const plainCapacities = updatedSprint.days.map((d, index) => ({
    id: `${updatedSprint.id}-cap-${index}`,
    sprintId: updatedSprint.id,
    date: d.date,
    pulseCount: d.capacity,
    note: d.note,
  }));

  const plainAvailableItems = availableItems.map((item) => ({
    id: item.id,
    title: item.title,
    storyPoints: item.storyPoints,
    why: item.why,
  }));

  const plainTodoTasks = todoTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    estimatedPulse: t.estimatedPulse,
    actualPulse: t.actualPulse,
    remainingPulse: t.remainingPulse,
    deadline: t.deadline,
    priority: t.priority,
  }));



  const plainSnapshots = updatedSprint.days
    .filter((d) => d.remaining !== null)
    .map((d, index) => ({
      id: `${updatedSprint.id}-snap-${index}`,
      sprintId: updatedSprint.id,
      date: d.date,
      remainingPulse: d.remaining!,
      createdAt: d.date,
    }));

  return (
    <PlanningBoard
      sprint={plainSprint as never}
      initialCapacities={plainCapacities as never}
      snapshots={plainSnapshots as never}
      sprintItems={sprintItemsWithTasks as never}
      availableItems={plainAvailableItems as never}
      todoTasks={plainTodoTasks as never}
      velocity={velocity}
      pulseStats={pulseStats as never}
      chartData={chartData}
    />
  );
}

