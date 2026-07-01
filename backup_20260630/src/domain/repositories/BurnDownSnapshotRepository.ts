import { BurnDownSnapshot } from "../entities/BurnDownSnapshot";

export interface BurnDownSnapshotRepository {
  findBySprintId(sprintId: string): Promise<BurnDownSnapshot[]>;
  findBySprintIdAndDate(
    sprintId: string,
    date: Date,
  ): Promise<BurnDownSnapshot | null>;
  save(snapshot: BurnDownSnapshot): Promise<void>;
  deleteBySprintId(sprintId: string): Promise<void>;
}
