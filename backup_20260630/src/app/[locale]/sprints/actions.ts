"use server";

import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbCapacityRepository } from "@/infrastructure/repositories/LowDbCapacityRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbBurnDownSnapshotRepository } from "@/infrastructure/repositories/LowDbBurnDownSnapshotRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { revalidatePath } from "next/cache";
import { Capacity } from "@/domain/entities/Capacity";
type DbCapacity = {
  id: string;
  sprintId: string;
  date: Date;
  pulseCount: number;
  note?: string | null;
};

import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbTodoTaskRepository } from "@/infrastructure/repositories/LowDbTodoTaskRepository";

const sprintRepository = new LowDbSprintRepository();
const capacityRepository = new LowDbCapacityRepository();
const backlogRepository = new LowDbBacklogRepository();
const burnDownSnapshotRepository = new LowDbBurnDownSnapshotRepository();
const taskRepository = new LowDbTaskRepository();
const todoTaskRepository = new LowDbTodoTaskRepository();

const useCase = new ManageSprintUseCase(
  sprintRepository,
  capacityRepository,
  backlogRepository,
  burnDownSnapshotRepository,
  taskRepository,
  todoTaskRepository,
);

export async function updateCapacitiesAction(
  sprintId: string,
  capacitiesData: DbCapacity[],
) {
  const capacities = capacitiesData.map(
    (c) =>
      new Capacity(c.id, c.sprintId, new Date(c.date), c.pulseCount, c.note),
  );
  await useCase.updateCapacities(capacities);
  revalidatePath("/sprints");
  revalidatePath(`/sprints/${sprintId}`);
}

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
