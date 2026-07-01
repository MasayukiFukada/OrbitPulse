import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { Task, TaskStatus } from "@/domain/entities/Task";
import { getDb, RawSprint, RawBacklogItem, RawTask } from "../db/json-db";

export class LowDbTaskRepository implements TaskRepository {
  async findByBacklogItemId(backlogItemId: string): Promise<Task[]> {
    const db = await getDb();
    await db.read();
    
    // バックログアイテムの中から該当するものを探し、そのタスクを返す
    for (const s of db.data.sprints) {
      if (s.backlogItems) {
        const item = s.backlogItems.find((i: RawBacklogItem) => i.id === backlogItemId);
        if (item && item.tasks) {
          return item.tasks.map((t: RawTask) => this.toEntity(t));
        }
      }
    }
    
    // 未割当バックログからも探す
    if (db.data.backlogItems) {
      const item = db.data.backlogItems.find((i: RawBacklogItem) => i.id === backlogItemId);
      if (item && item.tasks) {
        return item.tasks.map((t: RawTask) => this.toEntity(t));
      }
    }

    return [];
  }

  async findById(id: string): Promise<Task | null> {
    const db = await getDb();
    await db.read();
    
    // 全てのバックログアイテムの中からタスクを探す
    const findInItems = (items: RawBacklogItem[]) => {
      for (const item of items) {
        if (item.tasks) {
          const found = item.tasks.find((t: RawTask) => t.id === id);
          if (found) return found;
        }
      }
      return null;
    };

    // スプリント内のバックログ
    for (const s of db.data.sprints) {
      if (s.backlogItems) {
        const found = findInItems(s.backlogItems);
        if (found) return this.toEntity(found);
      }
    }

    // 未割当バックログ
    if (db.data.backlogItems) {
      const found = findInItems(db.data.backlogItems);
      if (found) return this.toEntity(found);
    }

    return null;
  }

  async save(item: Task): Promise<void> {
    const db = await getDb();
    await db.read();
    const raw = this.toRaw(item);
    let saved = false;

    const saveToItems = (items: RawBacklogItem[]) => {
      const itemIndex = items.findIndex(i => i.id === item.backlogItemId);
      if (itemIndex !== -1) {
        if (!items[itemIndex].tasks) items[itemIndex].tasks = [];
        const tasks = items[itemIndex].tasks;
        const taskIndex = tasks.findIndex((t: RawTask) => t.id === item.id);
        
        if (taskIndex !== -1) {
          tasks[taskIndex] = raw;
        } else {
          tasks.push(raw);
        }
        return true;
      }
      return false;
    };

    // スプリント内のバックログに保存
    for (const s of db.data.sprints) {
      if (s.backlogItems) {
        if (saveToItems(s.backlogItems)) {
          saved = true;
          break;
        }
      }
    }

    // 未割当バックログに保存
    if (!saved && db.data.backlogItems) {
      if (saveToItems(db.data.backlogItems)) {
        saved = true;
      }
    }

    if (saved) {
      await db.write();
    }
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    
    const deleteFromItems = (items: RawBacklogItem[]) => {
      items.forEach(item => {
        if (item.tasks) {
          item.tasks = item.tasks.filter((t: RawTask) => t.id !== id);
        }
      });
    };

    db.data.sprints.forEach((s: RawSprint) => {
      if (s.backlogItems) deleteFromItems(s.backlogItems);
    });
    
    if (db.data.backlogItems) deleteFromItems(db.data.backlogItems);

    await db.write();
  }

  private toEntity(data: RawTask): Task {
    return new Task(
      data.id,
      data.backlogItemId,
      data.title,
      data.status as TaskStatus,
      data.estimatedPulse,
      data.actualPulse,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  private toRaw(item: Task): RawTask {
    return {
      id: item.id,
      backlogItemId: item.backlogItemId,
      title: item.title,
      status: item.status,
      estimatedPulse: item.estimatedPulse,
      actualPulse: item.actualPulse,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
