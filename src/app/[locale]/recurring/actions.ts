"use server";

import { LowDbRecurringTaskRepository } from "@/infrastructure/repositories/LowDbRecurringTaskRepository";
import { LowDbCategoryRepository } from "@/infrastructure/repositories/LowDbCategoryRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageRecurringTaskUseCase } from "@/application/use-cases/ManageRecurringTaskUseCase";
import { ManageCategoryUseCase } from "@/application/use-cases/ManageCategoryUseCase";
import { revalidatePath } from "next/cache";
import { RecurringPattern } from "@/domain/entities/RecurringTask";

const recurringTaskRepository = new LowDbRecurringTaskRepository();
const categoryRepository = new LowDbCategoryRepository();
const taskRepository = new LowDbTaskRepository();

const recurringUseCase = new ManageRecurringTaskUseCase(
  recurringTaskRepository,
  taskRepository
);
const categoryUseCase = new ManageCategoryUseCase(categoryRepository);

// --- Recurring Tasks Actions ---

export async function createRecurringTaskAction(formData: FormData) {
  const categoryId = formData.get("categoryId") as string;
  const title = formData.get("title") as string;
  const pattern = formData.get("pattern") as RecurringPattern;
  const patternValue = (formData.get("patternValue") as string) || "";
  const estimatedPulse = parseInt(formData.get("estimatedPulse") as string) || 0;

  await recurringUseCase.addRecurringTask({
    categoryId,
    title,
    pattern,
    patternValue,
    estimatedPulse,
  });

  revalidatePath("/recurring");
  revalidatePath("/sprints");
}

export async function updateRecurringTaskAction(id: string, formData: FormData) {
  const categoryId = formData.get("categoryId") as string;
  const title = formData.get("title") as string;
  const pattern = formData.get("pattern") as RecurringPattern;
  const patternValue = (formData.get("patternValue") as string) || "";
  const estimatedPulse = parseInt(formData.get("estimatedPulse") as string) || 0;

  await recurringUseCase.updateRecurringTask(id, {
    categoryId,
    title,
    pattern,
    patternValue,
    estimatedPulse,
  });

  revalidatePath("/recurring");
}

export async function deleteRecurringTaskAction(id: string) {
  await recurringUseCase.deleteRecurringTask(id);
  revalidatePath("/recurring");
}

// --- Category Actions ---

export async function createCategoryAction(formData: FormData) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  await categoryUseCase.addCategory({ name, color });

  revalidatePath("/recurring");
}

export async function updateCategoryAction(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  await categoryUseCase.updateCategory(id, { name, color });

  revalidatePath("/recurring");
}

export async function deleteCategoryAction(id: string) {
  const recurringTasks = await recurringUseCase.getRecurringTasks();
  for (const rt of recurringTasks) {
    if (rt.categoryId === id) {
      rt.categoryId = "default-category";
      await recurringTaskRepository.save(rt);
    }
  }

  const tasks = await taskRepository.findAll();
  for (const t of tasks) {
    if (t.categoryId === id) {
      t.categoryId = "default-category";
      await taskRepository.save(t);
    }
  }

  await categoryUseCase.deleteCategory(id);
  revalidatePath("/recurring");
}
