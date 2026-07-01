import { RecurringTaskRepository } from "@/domain/repositories/RecurringTaskRepository";
import { RecurringTask, RecurringPattern } from "@/domain/entities/RecurringTask";
import { getDb, RawRecurringTask } from "../db/json-db";

export class LowDbRecurringTaskRepository implements RecurringTaskRepository {
  async findAll(): Promise<RecurringTask[]> {
    const db = await getDb();
    await db.read();
    return db.data.recurringTasks.map((t: RawRecurringTask) => this.toEntity(t));
  }

  async findById(id: string): Promise<RecurringTask | null> {
    const db = await getDb();
    await db.read();
    const found = db.data.recurringTasks.find((t: RawRecurringTask) => t.id === id);
    return found ? this.toEntity(found) : null;
  }

  async save(item: RecurringTask): Promise<void> {
    const db = await getDb();
    await db.read();
    const raw = this.toRaw(item);
    const index = db.data.recurringTasks.findIndex((t: RawRecurringTask) => t.id === item.id);

    if (index !== -1) {
      db.data.recurringTasks[index] = raw;
    } else {
      db.data.recurringTasks.push(raw);
    }

    await db.write();
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.read();
    db.data.recurringTasks = db.data.recurringTasks.filter((t: RawRecurringTask) => t.id !== id);
    await db.write();
  }

  private toEntity(data: RawRecurringTask): RecurringTask {
    return new RecurringTask(
      data.id,
      data.categoryId,
      data.title,
      data.pattern as RecurringPattern,
      data.patternValue,
      data.estimatedPulse
    );
  }

  private toRaw(item: RecurringTask): RawRecurringTask {
    return {
      id: item.id,
      categoryId: item.categoryId,
      title: item.title,
      pattern: item.pattern,
      patternValue: item.patternValue,
      estimatedPulse: item.estimatedPulse
    };
  }
}
