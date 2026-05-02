import { BurnDownSnapshotRepository } from "@/domain/repositories/BurnDownSnapshotRepository";
import { BurnDownSnapshot } from "@/domain/entities/BurnDownSnapshot";
import { db } from "../db";
import { burnDownSnapshots } from "../db/schema";
import type { BurnDownSnapshot as DbBurnDownSnapshot } from "../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export class SqliteBurnDownSnapshotRepository implements BurnDownSnapshotRepository {
  async findBySprintId(sprintId: string): Promise<BurnDownSnapshot[]> {
    const results = await db
      .select()
      .from(burnDownSnapshots)
      .where(eq(burnDownSnapshots.sprintId, sprintId))
      .orderBy(burnDownSnapshots.date);
    return results.map(this.toEntity);
  }

  async findBySprintIdAndDate(
    sprintId: string,
    date: Date,
  ): Promise<BurnDownSnapshot | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [result] = await db
      .select()
      .from(burnDownSnapshots)
      .where(
        and(
          eq(burnDownSnapshots.sprintId, sprintId),
          gte(burnDownSnapshots.date, startOfDay),
          lte(burnDownSnapshots.date, endOfDay),
        ),
      );
    return result ? this.toEntity(result) : null;
  }

  async deleteBySprintId(sprintId: string): Promise<void> {
    await db
      .delete(burnDownSnapshots)
      .where(eq(burnDownSnapshots.sprintId, sprintId));
  }

  async save(snapshot: BurnDownSnapshot): Promise<void> {
    const existing = await this.findBySprintIdAndDate(
      snapshot.sprintId,
      snapshot.date,
    );

    if (existing) {
      await db
        .update(burnDownSnapshots)
        .set({
          remainingPulse: snapshot.remainingPulse,
        })
        .where(
          and(
            eq(burnDownSnapshots.sprintId, snapshot.sprintId),
            eq(burnDownSnapshots.date, snapshot.date),
          ),
        );
    } else {
      await db.insert(burnDownSnapshots).values({
        id: snapshot.id,
        sprintId: snapshot.sprintId,
        date: snapshot.date,
        remainingPulse: snapshot.remainingPulse,
        createdAt: snapshot.createdAt,
      });
    }
  }

  private toEntity(row: DbBurnDownSnapshot): BurnDownSnapshot {
    return new BurnDownSnapshot(
      row.id,
      row.sprintId,
      row.date,
      row.remainingPulse,
      row.createdAt ?? undefined,
    );
  }
}
