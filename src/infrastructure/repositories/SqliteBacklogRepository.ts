import { BacklogRepository } from "@/domain/repositories/BacklogRepository";
import { BacklogItem, BacklogItemStatus } from "@/domain/entities/BacklogItem";
import { db } from "../db";
import { backlogItems } from "../db/schema";
import type { BacklogItem as DbBacklogItem } from "../db/schema";
import { eq } from "drizzle-orm";

export class SqliteBacklogRepository implements BacklogRepository {
  async findAll(): Promise<BacklogItem[]> {
    const results = await db
      .select()
      .from(backlogItems)
      .orderBy(backlogItems.priority);
    return results.map(this.toEntity);
  }

  async findById(id: string): Promise<BacklogItem | null> {
    const [result] = await db
      .select()
      .from(backlogItems)
      .where(eq(backlogItems.id, id));
    return result ? this.toEntity(result) : null;
  }

  async save(item: BacklogItem): Promise<void> {
    const existing = await this.findById(item.id);

    if (existing) {
      await db
        .update(backlogItems)
        .set({
          subject: item.subject,
          title: item.title,
          why: item.why,
          description: item.description,
          acceptanceCriteria: item.acceptanceCriteria,
          storyPoints: item.storyPoints,
          status: item.status,
          sprintId: item.sprintId,
          priority: item.priority,
          updatedAt: new Date(),
        })
        .where(eq(backlogItems.id, item.id));
    } else {
      await db.insert(backlogItems).values({
        id: item.id,
        subject: item.subject,
        title: item.title,
        why: item.why,
        description: item.description,
        acceptanceCriteria: item.acceptanceCriteria,
        storyPoints: item.storyPoints,
        status: item.status,
        sprintId: item.sprintId,
        priority: item.priority,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    }
  }

  async delete(id: string): Promise<void> {
    await db.delete(backlogItems).where(eq(backlogItems.id, id));
  }

  private toEntity(row: DbBacklogItem): BacklogItem {
    return new BacklogItem(
      row.id,
      row.subject,
      row.title,
      row.why,
      row.description,
      row.acceptanceCriteria,
      row.storyPoints,
      row.status as BacklogItemStatus,
      row.sprintId,
      row.priority,
      row.createdAt,
      row.updatedAt,
    );
  }
}
