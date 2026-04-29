import { Sprint } from "../entities/Sprint";

export interface SprintRepository {
  findAll(): Promise<Sprint[]>;
  findById(id: string): Promise<Sprint | null>;
  findActive(): Promise<Sprint | null>;
  save(sprint: Sprint): Promise<void>;
  delete(id: string): Promise<void>;
}
