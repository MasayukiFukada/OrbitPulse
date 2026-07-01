import { LowDbRecurringTaskRepository } from "@/infrastructure/repositories/LowDbRecurringTaskRepository";
import { LowDbCategoryRepository } from "@/infrastructure/repositories/LowDbCategoryRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageRecurringTaskUseCase } from "@/application/use-cases/ManageRecurringTaskUseCase";
import { ManageCategoryUseCase } from "@/application/use-cases/ManageCategoryUseCase";
import RecurringConfigBoard from "./RecurringConfigBoard";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function RecurringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const recurringTaskRepository = new LowDbRecurringTaskRepository();
  const categoryRepository = new LowDbCategoryRepository();
  const taskRepository = new LowDbTaskRepository();

  const recurringUseCase = new ManageRecurringTaskUseCase(
    recurringTaskRepository,
    taskRepository
  );
  const categoryUseCase = new ManageCategoryUseCase(categoryRepository);

  const recurringTasks = await recurringUseCase.getRecurringTasks();
  const categories = await categoryUseCase.getCategories();

  // シリアライズ可能な形式に変換
  const plainTasks = recurringTasks.map(t => ({
    id: t.id,
    categoryId: t.categoryId,
    title: t.title,
    pattern: t.pattern,
    patternValue: t.patternValue,
    estimatedPulse: t.estimatedPulse
  }));

  const plainCategories = categories.map(c => ({
    id: c.id,
    name: c.name,
    color: c.color
  }));

  return (
    <RecurringConfigBoard 
      initialTasks={plainTasks} 
      initialCategories={plainCategories} 
    />
  );
}
