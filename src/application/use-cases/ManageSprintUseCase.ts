import { Sprint, SprintStatus } from "@/domain/entities/Sprint";
import { Capacity } from "@/domain/entities/Capacity";
import { SprintRepository } from "@/domain/repositories/SprintRepository";
import { CapacityRepository } from "@/domain/repositories/CapacityRepository";
import { BacklogRepository } from "@/domain/repositories/BacklogRepository";
import { BurnDownSnapshotRepository } from "@/domain/repositories/BurnDownSnapshotRepository";
import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { TodoTaskRepository } from "@/domain/repositories/TodoTaskRepository";
import { BurnDownSnapshot } from "@/domain/entities/BurnDownSnapshot";
import { nanoid } from "nanoid";

export class ManageSprintUseCase {
  constructor(
    private sprintRepository: SprintRepository,
    private capacityRepository: CapacityRepository,
    private backlogRepository: BacklogRepository,
    private burnDownSnapshotRepository?: BurnDownSnapshotRepository,
    private taskRepository?: TaskRepository,
    private todoTaskRepository?: TodoTaskRepository,
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
    const sprint = new Sprint(
      nanoid(),
      data.name,
      data.startDate,
      data.endDate,
      data.goal || null,
    );

    await this.sprintRepository.save(sprint);

    // スプリント期間中の日ごとのキャパシティをデフォルト(4パルス)で生成
    const capacities: Capacity[] = [];
    const current = new Date(data.startDate);
    while (current <= data.endDate) {
      capacities.push(new Capacity(nanoid(), sprint.id, new Date(current), 4));
      current.setDate(current.getDate() + 1);
    }

    await this.capacityRepository.saveAll(capacities);
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
      retrospective?: string;
    },
  ): Promise<void> {
    const sprint = await this.sprintRepository.findById(id);
    if (!sprint) throw new Error("Sprint not found");

    sprint.name = data.name;
    sprint.startDate = data.startDate;
    sprint.endDate = data.endDate;
    if (data.goal !== undefined) sprint.goal = data.goal;
    if (data.status !== undefined) sprint.status = data.status;
    if (data.retrospective !== undefined)
      sprint.retrospective = data.retrospective;

    await this.sprintRepository.save(sprint);
  }

  async deleteSprint(id: string): Promise<void> {
    // 0. スナップショットを削除
    if (this.burnDownSnapshotRepository) {
      await this.burnDownSnapshotRepository.deleteBySprintId(id);
    }

    // 1. キャパシティを削除
    await this.capacityRepository.deleteBySprintId(id);

    // 2. バックログアイテムの紐付けを解除
    const items = await this.getItemsInSprint(id);
    for (const item of items) {
      item.sprintId = null;
      await this.backlogRepository.save(item);
    }

    // 3. Todoタスクの紐付けを解除（sprintIdをnullに）
    if (this.todoTaskRepository) {
      const todoTasks = await this.todoTaskRepository.findBySprintId(id);
      for (const todoTask of todoTasks) {
        todoTask.sprintId = null;
        await this.todoTaskRepository.save(todoTask);
      }
    }

    // 4. スプリント本体を削除
    await this.sprintRepository.delete(id);
  }

  async getCapacities(sprintId: string): Promise<Capacity[]> {
    return this.capacityRepository.findBySprintId(sprintId);
  }

  async updateCapacities(capacities: Capacity[]): Promise<void> {
    await this.capacityRepository.saveAll(capacities);
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

  async calculateRemainingPulse(sprintId: string): Promise<number> {
    if (!this.taskRepository || !this.todoTaskRepository) {
      throw new Error("TaskRepository and TodoTaskRepository are required");
    }

    let remainingPulse = 0;

    // スプリント内のバックログアイテム配下のタスクの未完了分を計算
    const items = await this.getItemsInSprint(sprintId);
    for (const item of items) {
      const tasks = await this.taskRepository.findByBacklogItemId(item.id);
      for (const task of tasks) {
        if (task.status !== "done" && task.status !== "pooled") {
          remainingPulse += task.estimatedPulse;
        }
      }
    }

    // スプリント内のTodoタスクの未完了分を計算
    const todoTasks = await this.todoTaskRepository.findBySprintId(sprintId);
    for (const todoTask of todoTasks) {
      if (todoTask.status !== "done" && todoTask.status !== "pooled") {
        remainingPulse += todoTask.estimatedPulse;
      }
    }

    return remainingPulse;
  }

  async takeSnapshot(sprintId: string, date?: Date): Promise<void> {
    if (
      !this.burnDownSnapshotRepository ||
      !this.taskRepository ||
      !this.todoTaskRepository
    ) {
      throw new Error("Required repositories are not set");
    }

    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    // 既にスナップショットがあるか確認（上書きするため取得）
    const existing =
      await this.burnDownSnapshotRepository.findBySprintIdAndDate(
        sprintId,
        targetDate,
      );

    const remainingPulse = await this.calculateRemainingPulse(sprintId);

    if (existing) {
      // 既存のスナップショットを上書き（新しいインスタンスを作成）
      const updatedSnapshot = new BurnDownSnapshot(
        existing.id,
        existing.sprintId,
        existing.date,
        remainingPulse,
        new Date(), // updatedAt は新しい日付を使用
      );
      await this.burnDownSnapshotRepository.save(updatedSnapshot);
    } else {
      // 新規作成
      const snapshot = new BurnDownSnapshot(
        nanoid(),
        sprintId,
        targetDate,
        remainingPulse,
      );
      await this.burnDownSnapshotRepository.save(snapshot);
    }
  }

  async getSnapshots(sprintId: string): Promise<BurnDownSnapshot[]> {
    if (!this.burnDownSnapshotRepository) {
      throw new Error("BurnDownSnapshotRepository is not set");
    }

    return this.burnDownSnapshotRepository.findBySprintId(sprintId);
  }

  async fillMissingSnapshots(sprintId: string): Promise<void> {
    if (
      !this.burnDownSnapshotRepository ||
      !this.taskRepository ||
      !this.todoTaskRepository
    ) {
      throw new Error("Required repositories are not set");
    }

    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) return;

    const startDate = new Date(sprint.startDate);
    startDate.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const currentDate = new Date(startDate);

    while (currentDate <= yesterday) {
      const existing =
        await this.burnDownSnapshotRepository.findBySprintIdAndDate(
          sprintId,
          currentDate,
        );
      if (!existing) {
        const remainingPulse = await this.calculateRemainingPulse(sprintId);

        const snapshot = new BurnDownSnapshot(
          nanoid(),
          sprintId,
          new Date(currentDate),
          remainingPulse,
        );
        await this.burnDownSnapshotRepository.save(snapshot);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
}
