"use server";

import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { revalidatePath } from "next/cache";

const taskRepository = new LowDbTaskRepository();
const useCase = new ManageTaskUseCase(taskRepository);

export async function createIgniteTemplateAction(formData: FormData) {
  const title = formData.get("title") as string;
  const priority = parseInt(formData.get("priority") as string) || 0; // 0: Common, 1: Rare, 2: Super Rare, 3: Ultra Rare

  await useCase.addIgniteTemplate(title, priority);

  revalidatePath("/ignite/tasks");
  revalidatePath("/ignite");
  revalidatePath("/");
}

export async function updateIgniteTemplateAction(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const priority = parseInt(formData.get("priority") as string) || 0;

  await useCase.updateTask(id, {
    title,
    sprintId: null,
    backlogItemId: null,
    categoryId: "ignite-gacha",
    estimatedPulse: 0, // 0固定
    deadline: null,
    priority,
    status: "pooled"
  });

  revalidatePath("/ignite/tasks");
  revalidatePath("/ignite");
  revalidatePath("/");
}

export async function deleteIgniteTemplateAction(id: string) {
  await useCase.deleteTask(id);
  
  revalidatePath("/ignite/tasks");
  revalidatePath("/ignite");
  revalidatePath("/");
}
