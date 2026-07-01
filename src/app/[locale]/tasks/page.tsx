import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbCategoryRepository } from "@/infrastructure/repositories/LowDbCategoryRepository";
import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import { ManageCategoryUseCase } from "@/application/use-cases/ManageCategoryUseCase";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import TaskConfigBoard from "./TaskConfigBoard";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const taskRepository = new LowDbTaskRepository();
  const backlogRepository = new LowDbBacklogRepository();
  const categoryRepository = new LowDbCategoryRepository();
  const sprintRepository = new LowDbSprintRepository();

  const taskUseCase = new ManageTaskUseCase(taskRepository);
  const backlogUseCase = new ManageBacklogUseCase(backlogRepository, taskRepository);
  const categoryUseCase = new ManageCategoryUseCase(categoryRepository);
  const sprintUseCase = new ManageSprintUseCase(
    sprintRepository,
    backlogRepository,
    taskRepository
  );

  const tasks = await taskUseCase.getTasks();
  const backlogItems = await backlogUseCase.getBacklogItems();
  const categories = await categoryUseCase.getCategories();
  const sprints = await sprintUseCase.getSprints();

  // シリアライズ可能な形式に変換
  const plainTasks = tasks.map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    sprintId: t.sprintId,
    backlogItemId: t.backlogItemId,
    categoryId: t.categoryId,
    recurringTaskId: t.recurringTaskId,
    estimatedPulse: t.estimatedPulse,
    actualPulse: t.actualPulse,
    remainingPulse: t.remainingPulse,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    priority: t.priority,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  const plainBacklogs = backlogItems.map(b => ({
    id: b.id,
    title: b.title,
    subject: b.subject,
  }));

  const plainCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  const plainSprints = sprints.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status,
  }));

  return (
    <TaskConfigBoard
      initialTasks={plainTasks}
      backlogItems={plainBacklogs}
      categories={plainCategories}
      sprints={plainSprints}
    />
  );
}
