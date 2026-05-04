import { SprintRepository } from "@/domain/repositories/SprintRepository";
import { Sprint, SprintStatus } from "@/domain/entities/Sprint";
import { getDb, RawSprint } from "../db/json-db";
import { RawSprint as RawSprintType } from "../db/json-db";

export class LowDbSprintRepository implements SprintRepository {
  async findAll(): Promise<Sprint[]> {
    const db = await getDb();
    return [...db.data.sprints]
      .sort((a: RawSprint, b: RawSprint) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .map((s: RawSprint) => this.toEntity(s));
  }

  async findById(id: string): Promise<Sprint | null> {
    const db = await getDb();
    const found = db.data.sprints.find((s: RawSprint) => s.id === id);
    return found ? this.toEntity(found) : null;
  }

  async findActive(): Promise<Sprint | null> {
    const db = await getDb();
    const found = db.data.sprints.find((s: RawSprint) => s.status === 'active');
    return found ? this.toEntity(found) : null;
  }

  async save(item: Sprint): Promise<void> {
    console.log(`Saving Sprint: ${item.name} (id: ${item.id})`);
    const db = await getDb();
    const index = db.data.sprints.findIndex((s: RawSprint) => s.id === item.id);
    
    if (index !== -1) {
      // 既存データの更新（ネストされたデータは保持する）
      const existing = db.data.sprints[index];
      db.data.sprints[index] = {
        ...existing,
        name: item.name,
        goal: item.goal,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString(),
        status: item.status as RawSprintType['status'],
        retrospective: item.retrospective,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // 新規作成
      db.data.sprints.push({
        id: item.id,
        name: item.name,
        goal: item.goal,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString(),
        status: item.status as RawSprintType['status'],
        retrospective: item.retrospective,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        todoTasks: [],
        backlogItems: [],
        capacities: [],
        snapshots: [],
      });
    }

    await db.write();
    console.log(`Successfully saved Sprint to lowDB.`);
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    db.data.sprints = db.data.sprints.filter((s: RawSprint) => s.id !== id);
    await db.write();
  }

  private toEntity(data: RawSprint): Sprint {
    return new Sprint(
      data.id,
      data.name,
      new Date(data.startDate),
      new Date(data.endDate),
      data.goal,
      data.status as SprintStatus,
      data.retrospective,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }
}
