import { BacklogRepository } from "@/domain/repositories/BacklogRepository";
import { BacklogItem, BacklogItemStatus } from "@/domain/entities/BacklogItem";
import { getDb, RawBacklogItem } from "../db/json-db";

export class LowDbBacklogRepository implements BacklogRepository {
  async findAll(): Promise<BacklogItem[]> {
    const db = await getDb();
    await db.read();
    return db.data.backlogItems
      .map((i: RawBacklogItem) => this.toEntity(i))
      .sort((a, b) => a.priority - b.priority);
  }

  async findById(id: string): Promise<BacklogItem | null> {
    const db = await getDb();
    await db.read();
    const found = db.data.backlogItems.find((i: RawBacklogItem) => i.id === id);
    return found ? this.toEntity(found) : null;
  }

  async save(item: BacklogItem): Promise<void> {
    const db = await getDb();
    await db.read();
    const raw = this.toRaw(item);
    const index = db.data.backlogItems.findIndex((i: RawBacklogItem) => i.id === item.id);

    if (index !== -1) {
      db.data.backlogItems[index] = {
        ...raw,
        updatedAt: new Date().toISOString()
      };
    } else {
      db.data.backlogItems.push(raw);
    }

    await db.write();
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.read();
    db.data.backlogItems = db.data.backlogItems.filter((i: RawBacklogItem) => i.id !== id);
    await db.write();
  }

  private toEntity(data: RawBacklogItem): BacklogItem {
    return new BacklogItem(
      data.id,
      data.subject,
      data.title,
      data.why,
      data.description,
      data.acceptanceCriteria,
      data.storyPoints,
      data.status as BacklogItemStatus,
      data.sprintId,
      data.categoryId,
      data.priority,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  private toRaw(item: BacklogItem): RawBacklogItem {
    return {
      id: item.id,
      sprintId: item.sprintId,
      categoryId: item.categoryId,
      subject: item.subject,
      title: item.title,
      why: item.why,
      description: item.description,
      acceptanceCriteria: item.acceptanceCriteria,
      storyPoints: item.storyPoints,
      status: item.status,
      priority: item.priority,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}

