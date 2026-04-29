"use server";

import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { ManageBacklogUseCase } from "@/application/use-cases/ManageBacklogUseCase";
import { revalidatePath } from "next/cache";

const repository = new SqliteBacklogRepository();
const useCase = new ManageBacklogUseCase(repository);

export async function addBacklogItemAction(formData: FormData) {
  const subject = formData.get("subject") as string || "私";
  const title = formData.get("title") as string;
  const why = formData.get("why") as string;
  const description = formData.get("description") as string;
  const acceptanceCriteria = formData.get("acceptanceCriteria") as string;
  const storyPoints = parseInt(formData.get("storyPoints") as string) || 0;

  await useCase.addBacklogItem({ subject, title, why, description, acceptanceCriteria, storyPoints });
  revalidatePath("/backlog");
}

export async function updateBacklogItemAction(id: string, formData: FormData) {
  const subject = formData.get("subject") as string;
  const title = formData.get("title") as string;
  const why = formData.get("why") as string;
  const description = formData.get("description") as string;
  const acceptanceCriteria = formData.get("acceptanceCriteria") as string;
  const storyPoints = parseInt(formData.get("storyPoints") as string) || 0;

  await useCase.updateBacklogItem(id, { subject, title, why, description, acceptanceCriteria, storyPoints });
  revalidatePath("/backlog");
}

export async function deleteBacklogItemAction(id: string) {
  await useCase.deleteItem(id);
  revalidatePath("/backlog");
}
