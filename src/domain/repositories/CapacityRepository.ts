import { Capacity } from "../entities/Capacity";

export interface CapacityRepository {
  findBySprintId(sprintId: string): Promise<Capacity[]>;
  saveAll(capacities: Capacity[]): Promise<void>;
  deleteBySprintId(sprintId: string): Promise<void>;
}
