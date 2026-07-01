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

  // 未完了アイテムを上にするソート
  // 完了判定: taskStats.total > 0 && taskStats.done === taskStats.total
  const sorted = items.slice().sort((a, b) => {
    const aCompleted =
      a.taskStats &&
      a.taskStats.total > 0 &&
      a.taskStats.done === a.taskStats.total;
    const bCompleted =
      b.taskStats &&
      b.taskStats.total > 0 &&
      b.taskStats.done === b.taskStats.total;

    if (aCompleted === bCompleted) {
      // 同じ完了状態なら優先度（大きい方を先）→作成日時（古い方を先）
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pa !== pb) return pb - pa;
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return at - bt;
    }

    // 未完了を先にする（完了なら下に）
    return aCompleted ? 1 : -1;
  });

  // シリアライズ可能な形式に変換
  const plainItems = sorted.map((item) => ({
    id: item.id,
    subject: item.subject,
    title: item.title,
    why: item.why ?? "",
    description: item.description ?? "",
    acceptanceCriteria: item.acceptanceCriteria ?? "",
    storyPoints: item.storyPoints ?? 0,
    status: item.status,
    sprintId: item.sprintId ?? null,
    priority: item.priority ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    taskStats: item.taskStats,
  }));

  return <BacklogList initialItems={plainItems} />;
}
