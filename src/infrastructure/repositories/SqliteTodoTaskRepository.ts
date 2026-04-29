import { TodoTaskRepository } from "@/domain/repositories/TodoTaskRepository";
import { TodoTask, TodoTaskStatus } from "@/domain/entities/TodoTask";
import { db } from "../db";
import { todoTasks } from "../db/schema";
import { eq, isNull } from "drizzle-orm";

export class SqliteTodoTaskRepository implements TodoTaskRepository {
  async findBySprintId(sprintId: string): Promise<TodoTask[]> {
    const results = await db
      .select()
      .from(todoTasks)
      .where(eq(todoTasks.sprintId, sprintId))
      .orderBy(todoTasks.priority, todoTasks.createdAt);
    return results.map(this.toEntity);
  }

  async findAllUnassigned(): Promise<TodoTask[]> {
    const results = await db
      .select()
      .from(todoTasks)
      .where(isNull(todoTasks.sprintId))
      .orderBy(todoTasks.priority, todoTasks.createdAt);
    return results.map(this.toEntity);
  }

  async findById(id: string): Promise<TodoTask | null> {
    const [result] = await db.select().from(todoTasks).where(eq(todoTasks.id, id));
    return result ? this.toEntity(result) : null;
  }

  async save(item: TodoTask): Promise<void> {
    const existing = await this.findById(item.id);

    if (existing) {
      await db
        .update(todoTasks)
        .set({
          sprintId: item.sprintId,
          title: item.title,
          status: item.status,
          estimatedPulse: item.estimatedPulse,
          actualPulse: item.actualPulse,
          deadline: item.deadline,
          priority: item.priority,
          updatedAt: new Date(),
        })
        .where(eq(todoTasks.id, item.id));
    } else {
      await db.insert(todoTasks).values({
        id: item.id,
        sprintId: item.sprintId,
        title: item.title,
        status: item.status,
        estimatedPulse: item.estimatedPulse,
        actualPulse: item.actualPulse,
        deadline: item.deadline,
        priority: item.priority,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(todoTasks).where(eq(todoTasks.id, id));
  }

  async updateSprintId(id: string, sprintId: string | null): Promise<void> {
    await db
      .update(todoTasks)
      .set({ sprintId: sprintId, updatedAt: new Date() })
      .where(eq(todoTasks.id, id));
  }

  private toEntity(row: any): TodoTask {
    return new TodoTask(
      row.id,
      row.title,
      row.sprintId,
      row.status as TodoTaskStatus,
      row.estimatedPulse,
      row.actualPulse,
      row.deadline,
      row.priority,
      row.createdAt,
      row.updatedAt
    );
  }
}
