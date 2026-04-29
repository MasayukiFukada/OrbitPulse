import { SprintRepository } from "@/domain/repositories/SprintRepository";
import { Sprint, SprintStatus } from "@/domain/entities/Sprint";
import { db } from "../db";
import { sprints } from "../db/schema";
import { eq, and } from "drizzle-orm";

export class SqliteSprintRepository implements SprintRepository {
  async findAll(): Promise<Sprint[]> {
    const results = await db.select().from(sprints).orderBy(sprints.startDate);
    return results.map(this.toEntity);
  }

  async findById(id: string): Promise<Sprint | null> {
    const [result] = await db.select().from(sprints).where(eq(sprints.id, id));
    return result ? this.toEntity(result) : null;
  }

  async findActive(): Promise<Sprint | null> {
    const [result] = await db
      .select()
      .from(sprints)
      .where(eq(sprints.status, "active"))
      .limit(1);
    return result ? this.toEntity(result) : null;
  }

  async save(item: Sprint): Promise<void> {
    const existing = await this.findById(item.id);

    if (existing) {
      await db
        .update(sprints)
        .set({
          name: item.name,
          goal: item.goal,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.status,
          retrospective: item.retrospective,
          updatedAt: new Date(),
        })
        .where(eq(sprints.id, item.id));
    } else {
      await db.insert(sprints).values({
        id: item.id,
        name: item.name,
        goal: item.goal,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        retrospective: item.retrospective,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(sprints).where(eq(sprints.id, id));
  }

  private toEntity(row: any): Sprint {
    return new Sprint(
      row.id,
      row.name,
      row.startDate,
      row.endDate,
      row.goal,
      row.status as SprintStatus,
      row.retrospective,
      row.createdAt,
      row.updatedAt
    );
  }
}
