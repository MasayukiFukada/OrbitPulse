import { TodoTask } from "../entities/TodoTask";

export interface TodoTaskRepository {
  findBySprintId(sprintId: string): Promise<TodoTask[]>;
  findAllUnassigned(): Promise<TodoTask[]>;
  findById(id: string): Promise<TodoTask | null>;
  save(todoTask: TodoTask): Promise<void>;
  delete(id: string): Promise<void>;
  updateSprintId(id: string, sprintId: string | null): Promise<void>;
}
