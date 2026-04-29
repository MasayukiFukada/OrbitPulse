"use server";

import { SqliteSprintRepository } from "@/infrastructure/repositories/SqliteSprintRepository";
import { SqliteCapacityRepository } from "@/infrastructure/repositories/SqliteCapacityRepository";
import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { SqliteBurnDownSnapshotRepository } from "@/infrastructure/repositories/SqliteBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { revalidatePath } from "next/cache";

const sprintRepository = new SqliteSprintRepository();
const capacityRepository = new SqliteCapacityRepository();
const backlogRepository = new SqliteBacklogRepository();
const burnDownSnapshotRepository = new SqliteBurnDownSnapshotRepository();
const useCase = new ManageSprintUseCase(
  sprintRepository,
  capacityRepository,
  backlogRepository,
  burnDownSnapshotRepository,
);

export async function createSprintAction(formData: FormData) {
  const name = formData.get("name") as string;
  const startDate = new Date(formData.get("startDate") as string);
  const endDate = new Date(formData.get("endDate") as string);
  const goal = formData.get("goal") as string;

  await useCase.createSprint({ name, startDate, endDate, goal });
  revalidatePath("/sprints");
}

export async function updateSprintAction(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const startDate = new Date(formData.get("startDate") as string);
  const endDate = new Date(formData.get("endDate") as string);
  const goal = formData.get("goal") as string;

  await useCase.updateSprint(id, { name, startDate, endDate, goal });
  revalidatePath("/sprints");
  revalidatePath(`/sprints/${id}`);
}

export async function deleteSprintAction(id: string) {
  await useCase.deleteSprint(id);
  revalidatePath("/sprints");
}
