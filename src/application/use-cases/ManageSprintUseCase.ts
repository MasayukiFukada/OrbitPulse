import { Sprint, SprintStatus, SprintDay } from "@/domain/entities/Sprint";
import { SprintRepository } from "@/domain/repositories/SprintRepository";
import { BacklogRepository } from "@/domain/repositories/BacklogRepository";
import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { nanoid } from "nanoid";

export class ManageSprintUseCase {
  constructor(
    private sprintRepository: SprintRepository,
    private backlogRepository: BacklogRepository,
    private taskRepository: TaskRepository,
  ) {}

  async getSprints(): Promise<Sprint[]> {
    return this.sprintRepository.findAll();
  }

  async getSprintById(id: string): Promise<Sprint | null> {
    return this.sprintRepository.findById(id);
  }

  async createSprint(data: {
    name: string;
    startDate: Date;
    endDate: Date;
    goal?: string;
  }): Promise<Sprint> {
    const days: SprintDay[] = [];
    const current = new Date(data.startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(data.endDate);
    end.setHours(0, 0, 0, 0);

    let iterations = 0;
    const MAX_ITERATIONS = 100;

    while (current <= end && iterations < MAX_ITERATIONS) {
      days.push({
        date: new Date(current),
        capacity: 4, // デフォルトキャパシティ
        remaining: null,
        note: null,
      });
      current.setDate(current.getDate() + 1);
      iterations++;
    }

    const sprint = new Sprint(
      nanoid(),
      data.name,
      data.startDate,
      data.endDate,
      data.goal || null,
      "planning",
      null,
      days,
    );

    await this.sprintRepository.save(sprint);
    return sprint;
  }

  async updateSprint(
    id: string,
    data: {
      name: string;
      startDate: Date;
      endDate: Date;
      goal?: string;
      status?: SprintStatus;
      retrospective?: string | null;
      days?: SprintDay[];
    },
  ): Promise<void> {
    const sprint = await this.sprintRepository.findById(id);
    if (!sprint) throw new Error("Sprint not found");

    const oldStatus = sprint.status;

    sprint.name = data.name;
    sprint.startDate = data.startDate;
    sprint.endDate = data.endDate;
    if (data.goal !== undefined) sprint.goal = data.goal;
    if (data.status !== undefined) sprint.status = data.status;
    if (data.retrospective !== undefined) sprint.retrospective = data.retrospective;
    if (data.days !== undefined) sprint.days = data.days;

    await this.sprintRepository.save(sprint);

    // ステータスが completed に変更された場合、未完了アイテムの紐付けを解除する
    if (data.status === "completed" && oldStatus !== "completed") {
      await this.cleanupUnfinishedItems(id);
    }
  }

  private async cleanupUnfinishedItems(sprintId: string): Promise<void> {
    // 1. 未完了のバックログアイテムを戻す
    const items = await this.getItemsInSprint(sprintId);
    for (const item of items) {
      const isDone = await this.isBacklogItemDone(item.id);
      if (!isDone) {
        item.sprintId = null;
        await this.backlogRepository.save(item);
      }
    }

    // 2. 未完了のタスクを戻す (sprintId を null にする)
    const tasks = await this.taskRepository.findBySprintId(sprintId);
    for (const task of tasks) {
      if (task.status !== "done") {
        task.sprintId = null;
        await this.taskRepository.save(task);
      }
    }
  }

  private async isBacklogItemDone(backlogItemId: string): Promise<boolean> {
    const tasks = await this.taskRepository.findByBacklogItemId(backlogItemId);
    if (tasks.length === 0) return false;
    return tasks.every((t) => t.status === "done");
  }

  async deleteSprint(id: string): Promise<void> {
    // 1. バックログアイテムの紐付けを解除
    const items = await this.getItemsInSprint(id);
    for (const item of items) {
      item.sprintId = null;
      await this.backlogRepository.save(item);
    }

    // 2. タスクの紐付けを解除（sprintIdをnullに）
    const tasks = await this.taskRepository.findBySprintId(id);
    for (const task of tasks) {
      task.sprintId = null;
      await this.taskRepository.save(task);
    }

    // 3. スプリント本体を削除
    await this.sprintRepository.delete(id);
  }

  async addBacklogItemToSprint(
    sprintId: string,
    backlogItemId: string,
  ): Promise<void> {
    const item = await this.backlogRepository.findById(backlogItemId);
    if (!item) throw new Error("Backlog item not found");

    item.sprintId = sprintId;
    await this.backlogRepository.save(item);
  }

  async removeBacklogItemFromSprint(backlogItemId: string): Promise<void> {
    const item = await this.backlogRepository.findById(backlogItemId);
    if (!item) throw new Error("Backlog item not found");

    item.sprintId = null;
    await this.backlogRepository.save(item);
  }

  async getItemsInSprint(sprintId: string) {
    const allItems = await this.backlogRepository.findAll();
    return allItems.filter((item) => item.sprintId === sprintId);
  }

  async calculateVelocity(sprintId: string): Promise<number> {
    const items = await this.getItemsInSprint(sprintId);
    let velocity = 0;
    for (const item of items) {
      const isDone = await this.isBacklogItemDone(item.id);
      if (isDone) {
        velocity += item.storyPoints;
      }
    }
    return velocity;
  }

  async calculateRemainingPulse(sprintId: string): Promise<number> {
    const tasks = await this.taskRepository.findBySprintId(sprintId);
    return tasks.reduce((sum, task) => sum + (task.status !== "pooled" ? task.remainingPulse : 0), 0);
  }

  async calculateInitialEstimate(sprintId: string): Promise<number> {
    const tasks = await this.taskRepository.findBySprintId(sprintId);
    return tasks.reduce((sum, task) => sum + (task.status !== "pooled" ? task.estimatedPulse : 0), 0);
  }

  async getSprintPulseStats(sprintId: string): Promise<{
    totalEstPulse: number;
    remainingPulse: number;
    totalActualPulse: number;
  }> {
    const tasks = await this.taskRepository.findBySprintId(sprintId);
    let totalEstPulse = 0;
    let remainingPulse = 0;
    let totalActualPulse = 0;

    for (const task of tasks) {
      if (task.status !== "pooled") {
        totalEstPulse += task.estimatedPulse;
        remainingPulse += task.remainingPulse;
        totalActualPulse += task.actualPulse;
      }
    }

    return { totalEstPulse, remainingPulse, totalActualPulse };
  }

  async takeSnapshot(sprintId: string, date?: Date): Promise<void> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) throw new Error("Sprint not found");

    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const remainingPulse = await this.calculateRemainingPulse(sprintId);

    // sprint.days の中から一致する日を探して remaining を更新
    const day = sprint.days.find(d => {
      const dDateStr = d.date instanceof Date ? d.date.toISOString().split("T")[0] : new Date(d.date).toISOString().split("T")[0];
      return dDateStr === dateStr;
    });

    if (day) {
      day.remaining = remainingPulse;
      await this.sprintRepository.save(sprint);
    }
  }

  async fillMissingSnapshots(sprintId: string): Promise<void> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) return;

    const totalEst = await this.calculateInitialEstimate(sprintId);

    // 今日より前の日で remaining が null の日を補完
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let prevRemaining = totalEst;

    for (const day of sprint.days) {
      const dayDate = day.date instanceof Date ? day.date : new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);

      if (dayDate < today) {
        if (day.remaining === null) {
          day.remaining = prevRemaining;
        } else {
          prevRemaining = day.remaining;
        }
      }
    }

    await this.sprintRepository.save(sprint);
  }
}

