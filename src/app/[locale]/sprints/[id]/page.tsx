import { SqliteSprintRepository } from "@/infrastructure/repositories/SqliteSprintRepository";
import { SqliteCapacityRepository } from "@/infrastructure/repositories/SqliteCapacityRepository";
import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { SqliteTaskRepository } from "@/infrastructure/repositories/SqliteTaskRepository";
import { SqliteTodoTaskRepository } from "@/infrastructure/repositories/SqliteTodoTaskRepository";
import { SqliteBurnDownSnapshotRepository } from "@/infrastructure/repositories/SqliteBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { ManageTodoUseCase } from "@/application/use-cases/ManageTodoUseCase";
import PlanningBoard, { SprintItemWithTasks } from "./PlanningBoard";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type {
  Sprint,
  Capacity,
  BacklogItem,
  TodoTask,
  BurnDownSnapshot,
} from "@/infrastructure/db/schema";

export const dynamic = "force-dynamic";

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  console.log("SprintDetailPage: locale =", locale, "id =", id);
  setRequestLocale(locale);

  const sprintRepository = new SqliteSprintRepository();
  const capacityRepository = new SqliteCapacityRepository();
  const backlogRepository = new SqliteBacklogRepository();
  const taskRepository = new SqliteTaskRepository();
  const todoTaskRepository = new SqliteTodoTaskRepository();
  const burnDownSnapshotRepository = new SqliteBurnDownSnapshotRepository();
  const sprintUseCase = new ManageSprintUseCase(
    sprintRepository,
    capacityRepository,
    backlogRepository,
    burnDownSnapshotRepository,
    taskRepository,
    todoTaskRepository,
  );
  const backlogUseCase = new ManageBacklogUseCase(backlogRepository);
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

  // スプリントに紐付いていないバックログアイテムを抽出
  const availableItems = allBacklogItems.filter((item) => !item.sprintId);

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
  }));

  return (
    <PlanningBoard
      sprint={plainSprint as unknown as Sprint}
      initialCapacities={plainCapacities as unknown as Capacity[]}
      snapshots={plainSnapshots as unknown as BurnDownSnapshot[]}
      sprintItems={sprintItemsWithTasks as unknown as SprintItemWithTasks[]}
      availableItems={plainAvailableItems as unknown as BacklogItem[]}
      todoTasks={plainTodoTasks as unknown as TodoTask[]}
      unassignedTodoTasks={plainUnassignedTodoTasks as unknown as TodoTask[]}
    />
  );
}
