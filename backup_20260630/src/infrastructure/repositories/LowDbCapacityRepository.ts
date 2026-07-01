import { CapacityRepository } from "@/domain/repositories/CapacityRepository";
import { Capacity } from "@/domain/entities/Capacity";
import { getDb, RawSprint, RawCapacity } from "../db/json-db";

export class LowDbCapacityRepository implements CapacityRepository {
  async findBySprintId(sprintId: string): Promise<Capacity[]> {
    const db = await getDb();
    await db.read();
    const sprint = db.data.sprints.find((s: RawSprint) => s.id === sprintId);
    if (!sprint || !sprint.capacities) return [];
    
    return sprint.capacities.map((c: RawCapacity) => this.toEntity(c));
  }

  async saveAll(items: Capacity[]): Promise<void> {
    if (items.length === 0) return;
    const db = await getDb();
    await db.read();
    
    // 全てのアイテムに対して処理を行う
    for (const item of items) {
      const sprintIndex = db.data.sprints.findIndex((s: RawSprint) => s.id === item.sprintId);
      if (sprintIndex === -1) continue;

      if (!db.data.sprints[sprintIndex].capacities) {
        db.data.sprints[sprintIndex].capacities = [];
      }
      
      const capacities = db.data.sprints[sprintIndex].capacities;
      const index = capacities.findIndex((c: RawCapacity) => c.id === item.id);
      const raw = this.toRaw(item);
      
      if (index !== -1) {
        capacities[index] = raw;
      } else {
        capacities.push(raw);
      }
    }

    await db.write();
  }

  async deleteBySprintId(sprintId: string): Promise<void> {
    const db = await getDb();
    const sprintIndex = db.data.sprints.findIndex((s: RawSprint) => s.id === sprintId);
    if (sprintIndex !== -1) {
      db.data.sprints[sprintIndex].capacities = [];
      await db.write();
    }
  }

  private toEntity(data: RawCapacity): Capacity {
    return new Capacity(
      data.id,
      data.sprintId,
      new Date(data.date),
      data.pulseCount,
      data.note
    );
  }

  private toRaw(item: Capacity): RawCapacity {
    return {
      id: item.id,
      sprintId: item.sprintId,
      date: item.date.toISOString(),
      pulseCount: item.pulseCount,
      note: item.note
    };
  }
}
