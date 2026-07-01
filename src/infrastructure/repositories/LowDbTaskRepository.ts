import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { Task, TaskStatus } from "@/domain/entities/Task";
import { getDb, RawTask } from "../db/json-db";

export class LowDbTaskRepository implements TaskRepository {
  async findAll(): Promise<Task[]> {
    const db = await getDb();
    await db.read();
    return db.data.tasks.map((t: RawTask) => this.toEntity(t));
  }

  async findByBacklogItemId(backlogItemId: string): Promise<Task[]> {
    const db = await getDb();
    await db.read();
    return db.data.tasks
      .filter((t: RawTask) => t.backlogItemId === backlogItemId)
      .map((t: RawTask) => this.toEntity(t));
  }

  async findBySprintId(sprintId: string): Promise<Task[]> {
    const db = await getDb();
    await db.read();
    return db.data.tasks
      .filter((t: RawTask) => t.sprintId === sprintId)
      .map((t: RawTask) => this.toEntity(t));
  }

  async findPooled(): Promise<Task[]> {
    const db = await getDb();
    await db.read();
    return db.data.tasks
      .filter((t: RawTask) => t.sprintId === null && t.backlogItemId === null)
      .map((t: RawTask) => this.toEntity(t));
  }

  async findById(id: string): Promise<Task | null> {
    const db = await getDb();
    await db.read();
    const found = db.data.tasks.find((t: RawTask) => t.id === id);
    return found ? this.toEntity(found) : null;
  }

  async save(item: Task): Promise<void> {
    const db = await getDb();
    await db.read();
    const raw = this.toRaw(item);
    const index = db.data.tasks.findIndex((t: RawTask) => t.id === item.id);

    if (index !== -1) {
      db.data.tasks[index] = {
        ...raw,
        updatedAt: new Date().toISOString()
      };
    } else {
      db.data.tasks.push(raw);
    }

    await db.write();
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.read();
    db.data.tasks = db.data.tasks.filter((t: RawTask) => t.id !== id);
    await db.write();
  }

  private toEntity(data: RawTask): Task {
    return new Task(
      data.id,
      data.title,
      data.status as TaskStatus,
      data.sprintId,
      data.backlogItemId,
      data.categoryId,
      data.recurringTaskId,
      data.estimatedPulse,
      data.actualPulse,
      data.remainingPulse,
      data.deadline ? new Date(data.deadline) : null,
      data.priority,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  private toRaw(item: Task): RawTask {
    return {
      id: item.id,
      sprintId: item.sprintId,
      backlogItemId: item.backlogItemId,
      categoryId: item.categoryId,
      recurringTaskId: item.recurringTaskId,
      title: item.title,
      status: item.status,
      estimatedPulse: item.estimatedPulse,
      actualPulse: item.actualPulse,
      remainingPulse: item.remainingPulse,
      deadline: item.deadline ? item.deadline.toISOString() : null,
      priority: item.priority,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

