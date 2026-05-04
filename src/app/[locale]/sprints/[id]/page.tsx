import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbCapacityRepository } from "@/infrastructure/repositories/LowDbCapacityRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbTodoTaskRepository } from "@/infrastructure/repositories/LowDbTodoTaskRepository";
import { LowDbBurnDownSnapshotRepository } from "@/infrastructure/repositories/LowDbBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { ManageTodoUseCase } from "@/application/use-cases/ManageTodoUseCase";
import PlanningBoard from "./PlanningBoard";
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
  const capacityRepository = new LowDbCapacityRepository();
  const backlogRepository = new LowDbBacklogRepository();
  const taskRepository = new LowDbTaskRepository();
  const todoTaskRepository = new LowDbTodoTaskRepository();
  const burnDownSnapshotRepository = new LowDbBurnDownSnapshotRepository();
  const sprintUseCase = new ManageSprintUseCase(
    sprintRepository,
    capacityRepository,
    backlogRepository,
    burnDownSnapshotRepository,
    taskRepository,
    todoTaskRepository,
  );
  const backlogUseCase = new ManageBacklogUseCase(backlogRepository, taskRepository);
  const taskUseCase = new ManageTaskUseCase(taskRepository);
  const todoUseCase = new ManageTodoUseCase(todoTaskRepository);

  const sprint = await sprintUseCase.getSprintById(id);
  if (!sprint) notFound();

  // スナップショットを自動記録（過去の日付も含めて）
  await sprintUseCase.fillMissingSnapshots(id);
  await sprintUseCase.takeSnapshot(id);

  const capacities = await sprintUseCase.getCapacities(id);
  const snapshots = await sprintUseCase.getSnapshots(id);
  const sprintItems = await sprintUseCase.getItemsInSprint(id);
  const allBacklogItems = await backlogUseCase.getBacklogItems();
  const todoTasks = await todoUseCase.getSprintTodoTasks(id);
  const unassignedTodoTasks = await todoUseCase.getUnassignedTodoTasks();

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
  // (現在のスプリント ID も activeOrPlanningSprintIds に含まれるため、結果的に現在のスプリントのアイテムは除外される)
  const availableItems = allBacklogItems.filter(
    (item) => !item.sprintId || !activeOrPlanningSprintIds.has(item.sprintId),
  );

  // シリアライズ可能な形式に変換
  const plainSprint = {
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    goal: sprint.goal,
    status: sprint.status,
  };

  const plainCapacities = capacities.map((c) => ({
    id: c.id,
    sprintId: c.sprintId,
    date: c.date,
    pulseCount: c.pulseCount,
    note: c.note,
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
    deadline: t.deadline,
    priority: t.priority,
  }));

  const plainUnassignedTodoTasks = unassignedTodoTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    estimatedPulse: t.estimatedPulse,
    actualPulse: t.actualPulse,
    deadline: t.deadline,
    priority: t.priority,
  }));

  const plainSnapshots = snapshots.map((s) => ({
    id: s.id,
    sprintId: s.sprintId,
    date: s.date,
    remainingPulse: s.remainingPulse,
    createdAt: s.createdAt,
  }));

  return (
    <PlanningBoard
      sprint={plainSprint as never}
      initialCapacities={plainCapacities as never}
      snapshots={plainSnapshots as never}
      sprintItems={sprintItemsWithTasks as never}
      availableItems={plainAvailableItems as never}
      todoTasks={plainTodoTasks as never}
      unassignedTodoTasks={plainUnassignedTodoTasks as never}
    />
  );
}
