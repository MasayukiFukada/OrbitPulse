import { BurnDownSnapshotRepository } from "@/domain/repositories/BurnDownSnapshotRepository";
import { BurnDownSnapshot } from "@/domain/entities/BurnDownSnapshot";
import { getDb, RawSprint, RawSnapshot } from "../db/json-db";

export class LowDbBurnDownSnapshotRepository implements BurnDownSnapshotRepository {
  async findBySprintId(sprintId: string): Promise<BurnDownSnapshot[]> {
    const db = await getDb();
    const sprint = db.data.sprints.find((s: RawSprint) => s.id === sprintId);
    if (!sprint || !sprint.snapshots) return [];
    
    return sprint.snapshots
      .map((s: RawSnapshot) => this.toEntity(s))
      .sort((a: BurnDownSnapshot, b: BurnDownSnapshot) => a.date.getTime() - b.date.getTime());
  }

  async findBySprintIdAndDate(
    sprintId: string,
    date: Date,
  ): Promise<BurnDownSnapshot | null> {
    const snapshots = await this.findBySprintId(sprintId);
    const targetDateStr = date.toDateString();
    
    const found = snapshots.find(s => s.date.toDateString() === targetDateStr);
    return found || null;
  }

  async deleteBySprintId(sprintId: string): Promise<void> {
    const db = await getDb();
    const sprintIndex = db.data.sprints.findIndex((s: RawSprint) => s.id === sprintId);
    if (sprintIndex !== -1) {
      db.data.sprints[sprintIndex].snapshots = [];
      await db.write();
    }
  }

  async save(snapshot: BurnDownSnapshot): Promise<void> {
    const db = await getDb();
    const sprintIndex = db.data.sprints.findIndex((s: RawSprint) => s.id === snapshot.sprintId);
    if (sprintIndex === -1) return;

    if (!db.data.sprints[sprintIndex].snapshots) {
      db.data.sprints[sprintIndex].snapshots = [];
    }
    
    const snapshots = db.data.sprints[sprintIndex].snapshots;
    const targetDateStr = snapshot.date.toDateString();
    const index = snapshots.findIndex((s: RawSnapshot) => new Date(s.date).toDateString() === targetDateStr);
    
    const raw = this.toRaw(snapshot);
    if (index !== -1) {
      snapshots[index] = raw;
    } else {
      snapshots.push(raw);
    }

    await db.write();
  }

  private toEntity(data: RawSnapshot): BurnDownSnapshot {
    return new BurnDownSnapshot(
      data.id,
      data.sprintId,
      new Date(data.date),
      data.remainingPulse,
      new Date(data.createdAt)
    );
  }

  private toRaw(item: BurnDownSnapshot): RawSnapshot {
    return {
      id: item.id,
      sprintId: item.sprintId,
      date: item.date.toISOString(),
      remainingPulse: item.remainingPulse,
      createdAt: item.createdAt.toISOString()
    };
  }
}
