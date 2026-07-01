import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbCapacityRepository } from "@/infrastructure/repositories/LowDbCapacityRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import SprintList from "./SprintList";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const sprintRepository = new LowDbSprintRepository();
  const capacityRepository = new LowDbCapacityRepository();
  const backlogRepository = new LowDbBacklogRepository();
  const useCase = new ManageSprintUseCase(
    sprintRepository,
    capacityRepository,
    backlogRepository,
  );

  const sprints = await useCase.getSprintsWithCapacities();

  // シリアライズ可能な形式に変換
  const plainSprints = sprints.map((sprint) => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    goal: sprint.goal,
    status: sprint.status,
    retrospective: sprint.retrospective,
    createdAt: sprint.createdAt,
    updatedAt: sprint.updatedAt,
    capacities: sprint.capacities.map(c => ({
      id: c.id,
      sprintId: c.sprintId,
      date: c.date,
      pulseCount: c.pulseCount,
      note: c.note
    }))
  }));

  return <SprintList initialSprints={plainSprints as never} />;
}
