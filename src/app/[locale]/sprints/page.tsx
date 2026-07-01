import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import SprintList from "./SprintList";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const sprintRepository = new LowDbSprintRepository();
  const backlogRepository = new LowDbBacklogRepository();
  const taskRepository = new LowDbTaskRepository();
  const useCase = new ManageSprintUseCase(
    sprintRepository,
    backlogRepository,
    taskRepository,
  );

  const sprints = await useCase.getSprints();

  // シリアライズ可能な形式に変換
  const plainSprints = sprints.map((sprint) => {
    const days = sprint.days.map(d => ({
      date: d.date,
      capacity: d.capacity,
      remaining: d.remaining,
      note: d.note
    }));

    return {
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      goal: sprint.goal,
      status: sprint.status,
      retrospective: sprint.retrospective,
      createdAt: sprint.createdAt,
      updatedAt: sprint.updatedAt,
      days,
      // 既存 UI コンポーネント (SprintList) との互換性のためのマッピング
      capacities: days.map((d, index) => ({
        id: `${sprint.id}-cap-${index}`,
        sprintId: sprint.id,
        date: d.date,
        pulseCount: d.capacity,
        note: d.note
      }))
    };
  });

  return <SprintList initialSprints={plainSprints as never} />;
}

