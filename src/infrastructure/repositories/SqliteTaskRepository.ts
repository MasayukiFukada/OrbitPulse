import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { Task, TaskStatus } from "@/domain/entities/Task";
import { db } from "../db";
import { tasks } from "../db/schema";
import type { Task as DbTask } from "../db/schema";
import { eq } from "drizzle-orm";

export class SqliteTaskRepository implements TaskRepository {
  async findByBacklogItemId(backlogItemId: string): Promise<Task[]> {
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.backlogItemId, backlogItemId))
      .orderBy(tasks.createdAt);
    return results.map(this.toEntity);
  }

  async findById(id: string): Promise<Task | null> {
    const [result] = await db.select().from(tasks).where(eq(tasks.id, id));
    return result ? this.toEntity(result) : null;
  }

  async save(item: Task): Promise<void> {
    const existing = await this.findById(item.id);

    if (existing) {
      await db
        .update(tasks)
        .set({
          title: item.title,
          status: item.status,
          estimatedPulse: item.estimatedPulse,
          actualPulse: item.actualPulse,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, item.id));
    } else {
      await db.insert(tasks).values({
        id: item.id,
        backlogItemId: item.backlogItemId,
        title: item.title,
        status: item.status,
        estimatedPulse: item.estimatedPulse,
        actualPulse: item.actualPulse,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  private toEntity(row: DbTask): Task {
    return new Task(
      row.id,
      row.backlogItemId,
      row.title,
      row.status as TaskStatus,
      row.estimatedPulse,
      row.actualPulse,
      row.createdAt ?? undefined,
      row.updatedAt ?? undefined,
    );
  }
}
