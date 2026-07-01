import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import IgniteTaskConfigBoard from "./IgniteTaskConfigBoard";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function IgniteTasksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const taskRepository = new LowDbTaskRepository();
  const taskUseCase = new ManageTaskUseCase(taskRepository);

  const templates = await taskUseCase.getIgniteTemplates();

  const plainTemplates = templates.map(t => ({
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

  return (
    <IgniteTaskConfigBoard
      initialTemplates={plainTemplates}
    />
  );
}
