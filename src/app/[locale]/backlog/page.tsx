import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import BacklogList from "./BacklogList";
import type { BacklogItem } from "@/domain/entities/BacklogItem";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const repository = new SqliteBacklogRepository();
  const useCase = new ManageBacklogUseCase(repository);
  const items = await useCase.getBacklogItems();

  // シリアライズ可能な形式に変換（エンティティクラスからプレーンオブジェクトへ）
  const plainItems: Omit<BacklogItem, 'id' | 'createdAt' | 'updatedAt'> & {
    id: string;
    createdAt: Date | null;
    updatedAt: Date | null;
  } = items.map((item) => ({
    id: item.id,
    subject: item.subject,
    title: item.title,
    why: item.why ?? '',
    description: item.description ?? '',
    acceptanceCriteria: item.acceptanceCriteria ?? '',
    storyPoints: item.storyPoints ?? 0,
    status: item.status,
    priority: item.priority ?? 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  })) as any;

  return (
    <BacklogList initialItems={plainItems as unknown as BacklogItem[]} />
  );
}
