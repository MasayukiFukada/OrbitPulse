import { TodoTaskRepository } from "@/domain/repositories/TodoTaskRepository";
import { TodoTask, TodoTaskStatus } from "@/domain/entities/TodoTask";
import { getDb, RawSprint, RawTodoTask } from "../db/json-db";

export class LowDbTodoTaskRepository implements TodoTaskRepository {
  async findBySprintId(sprintId: string): Promise<TodoTask[]> {
    const db = await getDb();
    const sprint = db.data.sprints.find((s: RawSprint) => s.id === sprintId);
    if (!sprint || !sprint.todoTasks) return [];
    
    return sprint.todoTasks.map((t: RawTodoTask) => this.toEntity(t));
  }

  async findAllUnassigned(): Promise<TodoTask[]> {
    const db = await getDb();
    return db.data.todoTasks.map((t: RawTodoTask) => this.toEntity(t));
  }

  async findById(id: string): Promise<TodoTask | null> {
    const db = await getDb();
    
    // 1. 未割当から探す
    let found = db.data.todoTasks.find((t: RawTodoTask) => t.id === id);
    if (found) return this.toEntity(found);
    
    // 2. 全スプリントの中から探す（ネスト構造への対応）
    for (const sprint of db.data.sprints) {
      if (sprint.todoTasks) {
        found = sprint.todoTasks.find((t: RawTodoTask) => t.id === id);
        if (found) return this.toEntity(found);
      }
    }
    
    return null;
  }

  async save(item: TodoTask): Promise<void> {
    console.log(`Saving TodoTask: ${item.title} (id: ${item.id}, sprintId: ${item.sprintId})`);
    const db = await getDb();
    const data = this.toRaw(item);

    let saved = false;

    if (item.sprintId) {
      // スプリントに紐付いている場合
      const sprintIndex = db.data.sprints.findIndex((s: RawSprint) => s.id === item.sprintId);
      if (sprintIndex !== -1) {
        console.log(`Saving to nested sprint: ${item.sprintId}`);
        if (!db.data.sprints[sprintIndex].todoTasks) {
          db.data.sprints[sprintIndex].todoTasks = [];
        }
        const tasks = db.data.sprints[sprintIndex].todoTasks;
        const taskIndex = tasks.findIndex((t: RawTodoTask) => t.id === item.id);
        
        if (taskIndex !== -1) {
          tasks[taskIndex] = data;
        } else {
          tasks.push(data);
        }
        
        // 未割当リストに存在した場合は削除
        db.data.todoTasks = db.data.todoTasks.filter((t: RawTodoTask) => t.id !== item.id);
        saved = true;
      } else {
        console.warn(`Sprint ${item.sprintId} not found in lowDB. Falling back to top-level todoTasks.`);
      }
    }

    if (!saved) {
      // 未割当、またはスプリントが見つからなかった場合
      console.log(`Saving to top-level todoTasks.`);
      const index = db.data.todoTasks.findIndex((t: RawTodoTask) => t.id === item.id);
      if (index !== -1) {
        db.data.todoTasks[index] = data;
      } else {
        db.data.todoTasks.push(data);
      }
      
      // 他のスプリントに紐付いていた場合はそこから削除（移動対応）
      db.data.sprints.forEach((s: RawSprint) => {
        if (s.todoTasks) {
          s.todoTasks = s.todoTasks.filter((t: RawTodoTask) => t.id !== item.id);
        }
      });
    }

    await db.write();
    console.log(`Successfully saved to lowDB.`);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    
    db.data.todoTasks = db.data.todoTasks.filter((t: RawTodoTask) => t.id !== id);
    db.data.sprints.forEach((s: RawSprint) => {
      if (s.todoTasks) {
        s.todoTasks = s.todoTasks.filter((t: RawTodoTask) => t.id !== id);
      }
    });

    await db.write();
  }

  async updateSprintId(id: string, sprintId: string | null): Promise<void> {
    const item = await this.findById(id);
    if (item) {
      const updated = new TodoTask(
        item.id,
        item.title,
        sprintId,
        item.status,
        item.estimatedPulse,
        item.actualPulse,
        item.deadline,
        item.priority,
        item.createdAt,
        new Date()
      );
      await this.save(updated);
    }
  }

  private toEntity(data: RawTodoTask): TodoTask {
    return new TodoTask(
      data.id,
      data.title,
      data.sprintId,
      data.status as TodoTaskStatus,
      data.estimatedPulse,
      data.actualPulse,
      data.deadline ? new Date(data.deadline) : null,
      data.priority ?? 0,
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }

  private toRaw(item: TodoTask): RawTodoTask {
    return {
      id: item.id,
      title: item.title,
      sprintId: item.sprintId,
      status: item.status,
      estimatedPulse: item.estimatedPulse,
      actualPulse: item.actualPulse,
      deadline: item.deadline?.toISOString() ?? null,
      priority: item.priority,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
