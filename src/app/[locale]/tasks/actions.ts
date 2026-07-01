"use server";

import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@/domain/entities/Task";

const taskRepository = new LowDbTaskRepository();
const useCase = new ManageTaskUseCase(taskRepository);

export async function createTaskAction(formData: FormData) {
  const title = formData.get("title") as string;
  const sprintId = (formData.get("sprintId") as string) || null;
  const backlogItemId = (formData.get("backlogItemId") as string) || null;
  const categoryId = (formData.get("categoryId") as string) || null;
  const estimatedPulse = parseInt(formData.get("estimatedPulse") as string) || 0;
  const deadlineStr = formData.get("deadline") as string;
  const deadline = deadlineStr ? new Date(deadlineStr) : null;
  const priority = parseInt(formData.get("priority") as string) || 0;

  await useCase.addTask({
    title,
    sprintId,
    backlogItemId,
    categoryId,
    estimatedPulse,
    deadline,
    priority,
  });

  revalidatePath("/tasks");
  revalidatePath("/sprints");
  if (sprintId) {
    revalidatePath(`/sprints/${sprintId}`);
  }
}

export async function updateTaskAction(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const sprintId = (formData.get("sprintId") as string) || null;
  const backlogItemId = (formData.get("backlogItemId") as string) || null;
  const categoryId = (formData.get("categoryId") as string) || null;
  const estimatedPulse = parseInt(formData.get("estimatedPulse") as string) || 0;
  const deadlineStr = formData.get("deadline") as string;
  const deadline = deadlineStr ? new Date(deadlineStr) : null;
  const priority = parseInt(formData.get("priority") as string) || 0;
  const status = formData.get("status") as TaskStatus;

  await useCase.updateTask(id, {
    title,
    sprintId,
    backlogItemId,
    categoryId,
    estimatedPulse,
    deadline,
    priority,
    status
  });

  revalidatePath("/tasks");
  revalidatePath("/sprints");
  if (sprintId) {
    revalidatePath(`/sprints/${sprintId}`);
  }
}

export async function deleteTaskAction(id: string, sprintId: string | null) {
  await useCase.deleteTask(id);
  revalidatePath("/tasks");
  revalidatePath("/sprints");
  if (sprintId) {
    revalidatePath(`/sprints/${sprintId}`);
  }
}
