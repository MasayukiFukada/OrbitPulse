import { RecurringTask } from "../entities/RecurringTask";

export interface RecurringTaskRepository {
  findAll(): Promise<RecurringTask[]>;
  findById(id: string): Promise<RecurringTask | null>;
  save(task: RecurringTask): Promise<void>;
  delete(id: string): Promise<void>;
}
