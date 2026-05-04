import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import BacklogList from "./BacklogList";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const repository = new LowDbBacklogRepository();
  const taskRepository = new LowDbTaskRepository();
  const useCase = new ManageBacklogUseCase(repository, taskRepository);
  const items = await useCase.getBacklogItemsWithStats();

  // シリアライズ可能な形式に変換
  const plainItems = items.map((item) => ({
    id: item.id,
    subject: item.subject,
    title: item.title,
    why: item.why ?? '',
    description: item.description ?? '',
    acceptanceCriteria: item.acceptanceCriteria ?? '',
    storyPoints: item.storyPoints ?? 0,
    status: item.status,
    sprintId: item.sprintId ?? null,
    priority: item.priority ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    taskStats: item.taskStats,
  }));

  return (
    <BacklogList initialItems={plainItems} />
  );
}
