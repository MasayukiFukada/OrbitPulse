import { Task } from "../entities/Task";

export interface TaskRepository {
  findByBacklogItemId(backlogItemId: string): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  save(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
}
