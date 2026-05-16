import { BacklogRepository } from "@/domain/repositories/BacklogRepository";
import { BacklogItem, BacklogItemStatus } from "@/domain/entities/BacklogItem";
import { getDb, RawSprint, RawBacklogItem } from "../db/json-db";

export class LowDbBacklogRepository implements BacklogRepository {
  async findAll(): Promise<BacklogItem[]> {
    const db = await getDb();
    await db.read();
    const items: BacklogItem[] = [];
    
    // 未割当のアイテム
    if (db.data.backlogItems) {
      db.data.backlogItems.forEach((i: RawBacklogItem) => items.push(this.toEntity(i)));
    }

    // スプリントに紐付いているアイテムを取得
    db.data.sprints.forEach((s: RawSprint) => {
      if (s.backlogItems) {
        s.backlogItems.forEach((i: RawBacklogItem) => items.push(this.toEntity(i)));
      }
    });
    
    return items.sort((a, b) => a.priority - b.priority);
  }

  async findById(id: string): Promise<BacklogItem | null> {
    const db = await getDb();
    await db.read();
    
    // 未割当から探す
    if (db.data.backlogItems) {
      const found = db.data.backlogItems.find((i: RawBacklogItem) => i.id === id);
      if (found) return this.toEntity(found);
    }

    // スプリントから探す
    for (const s of db.data.sprints) {
      if (s.backlogItems) {
        const found = s.backlogItems.find((i: RawBacklogItem) => i.id === id);
        if (found) return this.toEntity(found);
      }
    }
    return null;
  }

  async save(item: BacklogItem): Promise<void> {
    const db = await getDb();
    await db.read();
    const raw = this.toRaw(item);

    if (item.sprintId) {
      const sprintIndex = db.data.sprints.findIndex((s: RawSprint) => s.id === item.sprintId);
      if (sprintIndex !== -1) {
        if (!db.data.sprints[sprintIndex].backlogItems) {
          db.data.sprints[sprintIndex].backlogItems = [];
        }
        const items = db.data.sprints[sprintIndex].backlogItems;
        const index = items.findIndex((i: RawBacklogItem) => i.id === item.id);
        
        if (index !== -1) {
          // 既存タスクを保持しつつ更新
          const existingTasks = items[index].tasks || [];
          items[index] = { ...raw, tasks: existingTasks };
        } else {
          items.push({ ...raw, tasks: [] });
        }

        // 未割当リストや他のスプリントから削除
        db.data.backlogItems = db.data.backlogItems.filter((bi: RawBacklogItem) => bi.id !== item.id);
        db.data.sprints.forEach((s: RawSprint, i: number) => {
          if (i !== sprintIndex && s.backlogItems) {
            s.backlogItems = s.backlogItems.filter((bi: RawBacklogItem) => bi.id !== item.id);
          }
        });
      }
    } else {
      // 未割当として保存
      if (!db.data.backlogItems) db.data.backlogItems = [];
      const index = db.data.backlogItems.findIndex((i: RawBacklogItem) => i.id === item.id);
      if (index !== -1) {
        // 既存タスクを保持しつつ更新
        const existingTasks = db.data.backlogItems[index].tasks || [];
        db.data.backlogItems[index] = { ...raw, tasks: existingTasks };
      } else {
        db.data.backlogItems.push({ ...raw, tasks: [] });
      }

      // 全スプリントから削除
      db.data.sprints.forEach((s: RawSprint) => {
        if (s.backlogItems) {
          s.backlogItems = s.backlogItems.filter((bi: RawBacklogItem) => bi.id !== item.id);
        }
      });
    }

    await db.write();
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    db.data.backlogItems = db.data.backlogItems.filter((i: RawBacklogItem) => i.id !== id);
    db.data.sprints.forEach((s: RawSprint) => {
      if (s.backlogItems) {
        s.backlogItems = s.backlogItems.filter((i: RawBacklogItem) => i.id !== id);
      }
    });
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
      data.priority,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  private toRaw(item: BacklogItem): Omit<RawBacklogItem, "tasks"> {
    return {
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
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
