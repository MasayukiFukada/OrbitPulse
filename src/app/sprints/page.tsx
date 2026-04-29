import { SqliteSprintRepository } from "@/infrastructure/repositories/SqliteSprintRepository";
import { SqliteCapacityRepository } from "@/infrastructure/repositories/SqliteCapacityRepository";
import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import SprintList from "./SprintList";

export const dynamic = "force-dynamic";

export default async function SprintsPage() {
  const sprintRepository = new SqliteSprintRepository();
  const capacityRepository = new SqliteCapacityRepository();
  const backlogRepository = new SqliteBacklogRepository();
  const useCase = new ManageSprintUseCase(sprintRepository, capacityRepository, backlogRepository);
  
  const sprints = await useCase.getSprints();

  // シリアライズ可能な形式に変換
  const plainSprints = sprints.map(sprint => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    goal: sprint.goal,
    status: sprint.status,
    retrospective: sprint.retrospective,
    createdAt: sprint.createdAt,
    updatedAt: sprint.updatedAt,
  }));

  return <SprintList initialSprints={plainSprints as any} />;
}
