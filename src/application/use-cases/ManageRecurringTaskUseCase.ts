import { RecurringTask, RecurringPattern } from "@/domain/entities/RecurringTask";
import { RecurringTaskRepository } from "@/domain/repositories/RecurringTaskRepository";
import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { Task } from "@/domain/entities/Task";
import { nanoid } from "nanoid";

export class ManageRecurringTaskUseCase {
  constructor(
    private recurringTaskRepository: RecurringTaskRepository,
    private taskRepository: TaskRepository
  ) {}

  async getRecurringTasks(): Promise<RecurringTask[]> {
    return this.recurringTaskRepository.findAll();
  }

  async getRecurringTaskById(id: string): Promise<RecurringTask | null> {
    return this.recurringTaskRepository.findById(id);
  }

  async addRecurringTask(data: {
    categoryId: string;
    title: string;
    pattern: RecurringPattern;
    patternValue: string;
    estimatedPulse: number;
  }): Promise<RecurringTask> {
    const task = new RecurringTask(
      nanoid(),
      data.categoryId,
      data.title,
      data.pattern,
      data.patternValue,
      data.estimatedPulse
    );
    await this.recurringTaskRepository.save(task);
    return task;
  }

  async updateRecurringTask(
    id: string,
    data: {
      categoryId: string;
      title: string;
      pattern: RecurringPattern;
      patternValue: string;
      estimatedPulse: number;
    }
  ): Promise<void> {
    const task = await this.recurringTaskRepository.findById(id);
    if (!task) throw new Error("RecurringTask not found");

    task.categoryId = data.categoryId;
    task.title = data.title;
    task.pattern = data.pattern;
    task.patternValue = data.patternValue;
    task.estimatedPulse = data.estimatedPulse;

    await this.recurringTaskRepository.save(task);
  }

  async deleteRecurringTask(id: string): Promise<void> {
    await this.recurringTaskRepository.delete(id);
  }

  /**
   * 特定の日付（今日など）に対応する繰り返しタスクを、スプリントまたはプールに実体化（生成）する。
   * すでにその日付・テンプレートから生成されたタスクが登録されている場合はスキップする。
   */
  async generateTasksForDate(date: Date, sprintId: string | null = null): Promise<Task[]> {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });

    const parts = formatter.formatToParts(date);
    const yr = parseInt(parts.find(p => p.type === "year")!.value, 10);
    const mo = parseInt(parts.find(p => p.type === "month")!.value, 10) - 1;
    const dy = parseInt(parts.find(p => p.type === "day")!.value, 10);
    const hr = parseInt(parts.find(p => p.type === "hour")!.value, 10);
    const min = parseInt(parts.find(p => p.type === "minute")!.value, 10);
    const sec = parseInt(parts.find(p => p.type === "second")!.value, 10);

    const jstDate = new Date(yr, mo, dy, hr, min, sec);
    const dayOfWeek = (jstDate.getDay() === 0 ? 7 : jstDate.getDay()).toString(); // 1(月) - 7(日)
    const dayOfMonth = jstDate.getDate().toString();

    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${yr}-${pad(mo + 1)}-${pad(dy)}`;

    const templates = await this.recurringTaskRepository.findAll();
    const existingTasks = await this.taskRepository.findAll();
    const generatedTasks: Task[] = [];

    for (const template of templates) {
      const isAlreadyGenerated = existingTasks.some(t => {
        const tParts = formatter.formatToParts(t.createdAt);
        const tYr = tParts.find(p => p.type === "year")!.value;
        const tMo = tParts.find(p => p.type === "month")!.value.padStart(2, '0');
        const tDy = tParts.find(p => p.type === "day")!.value.padStart(2, '0');
        const tDateStr = `${tYr}-${tMo}-${tDy}`;
        return t.recurringTaskId === template.id && tDateStr === dateStr;
      });

      if (isAlreadyGenerated) continue;

      let shouldGenerate = false;

      if (template.pattern === "daily") {
        shouldGenerate = true;
      } else if (template.pattern === "weekly") {
        const days = template.patternValue.split(",");
        if (days.includes(dayOfWeek)) {
          shouldGenerate = true;
        }
      } else if (template.pattern === "monthly") {
        const days = template.patternValue.split(",");
        if (days.includes(dayOfMonth)) {
          shouldGenerate = true;
        }
      }

      if (shouldGenerate) {
        const newTask = new Task(
          nanoid(),
          template.title,
          sprintId ? "todo" : "pooled",
          sprintId,
          null, // backlogItemId
          template.categoryId,
          template.id, // recurringTaskId
          template.estimatedPulse,
          0, // actual
          template.estimatedPulse, // remaining
          date, // deadline
          0, // priority
          date, // createdAt
          new Date() // updatedAt
        );
        await this.taskRepository.save(newTask);
        generatedTasks.push(newTask);
      }
    }

    return generatedTasks;
  }
}
