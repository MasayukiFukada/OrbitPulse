"use server";

import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { revalidatePath } from "next/cache";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";

const sprintRepository = new LowDbSprintRepository();
const backlogRepository = new LowDbBacklogRepository();
const taskRepository = new LowDbTaskRepository();

const useCase = new ManageSprintUseCase(
  sprintRepository,
  backlogRepository,
  taskRepository,
);

export async function updateCapacitiesAction(
  sprintId: string,
  capacitiesData: { date: Date | string; capacity: number; note?: string | null }[],
) {
  const sprint = await sprintRepository.findById(sprintId);
  if (!sprint) throw new Error("Sprint not found");

  sprint.days = sprint.days.map((day) => {
    const dStr = new Date(day.date).toISOString().split("T")[0];
    const match = capacitiesData.find(
      (c) => new Date(c.date).toISOString().split("T")[0] === dStr
    );
    if (match) {
      return {
        ...day,
        capacity: match.capacity,
        note: match.note || null,
      };
    }
    return day;
  });

  await sprintRepository.save(sprint);
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

