import { CapacityRepository } from "@/domain/repositories/CapacityRepository";
import { Capacity } from "@/domain/entities/Capacity";
import { db } from "../db";
import { capacities } from "../db/schema";
import type { Capacity as DbCapacity } from "../db/schema";
import { eq } from "drizzle-orm";

export class SqliteCapacityRepository implements CapacityRepository {
  async findBySprintId(sprintId: string): Promise<Capacity[]> {
    const results = await db
      .select()
      .from(capacities)
      .where(eq(capacities.sprintId, sprintId))
      .orderBy(capacities.date);
    return results.map(this.toEntity);
  }

  async saveAll(items: Capacity[]): Promise<void> {
    if (items.length === 0) return;

    db.transaction((tx) => {
      for (const item of items) {
        const [existing] = tx
          .select()
          .from(capacities)
          .where(eq(capacities.id, item.id))
          .all();

        if (existing) {
          tx.update(capacities)
            .set({
              pulseCount: item.pulseCount,
              note: item.note,
              date: item.date,
            })
            .where(eq(capacities.id, item.id))
            .run();
        } else {
          tx.insert(capacities)
            .values({
              id: item.id,
              sprintId: item.sprintId,
              date: item.date,
              pulseCount: item.pulseCount,
              note: item.note,
            })
            .run();
        }
      }
    });
  }

  async deleteBySprintId(sprintId: string): Promise<void> {
    await db.delete(capacities).where(eq(capacities.sprintId, sprintId));
  }

  private toEntity(row: DbCapacity): Capacity {
    return new Capacity(
      row.id,
      row.sprintId,
      row.date,
      row.pulseCount,
      row.note,
    );
  }
}
