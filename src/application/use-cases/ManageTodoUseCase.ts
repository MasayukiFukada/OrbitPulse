import { TodoTask, TodoTaskStatus } from "@/domain/entities/TodoTask";
import { TodoTaskRepository } from "@/domain/repositories/TodoTaskRepository";
import { nanoid } from "nanoid";

export class ManageTodoUseCase {
  constructor(private todoTaskRepository: TodoTaskRepository) {}

  async getSprintTodoTasks(sprintId: string): Promise<TodoTask[]> {
    return this.todoTaskRepository.findBySprintId(sprintId);
  }

  async getUnassignedTodoTasks(): Promise<TodoTask[]> {
    return this.todoTaskRepository.findAllUnassigned();
  }

  async addTodoTask(data: {
    title: string;
    sprintId?: string | null;
    estimatedPulse?: number;
    deadline?: Date | null;
  }): Promise<TodoTask> {
    const todo = new TodoTask(
      nanoid(),
      data.title,
      data.sprintId || null,
      "todo",
      data.estimatedPulse || 0,
      0,
      data.deadline || null
    );
    await this.todoTaskRepository.save(todo);
    return todo;
  }

  async updateTodoPulse(id: string, actualPulse: number): Promise<void> {
    const todo = await this.todoTaskRepository.findById(id);
    if (!todo) throw new Error("TodoTask not found");
    todo.actualPulse = actualPulse;
    await this.todoTaskRepository.save(todo);
  }

  async updateTodoEstimatedPulse(id: string, estimatedPulse: number): Promise<void> {
    const todo = await this.todoTaskRepository.findById(id);
    if (!todo) throw new Error("TodoTask not found");
    todo.estimatedPulse = estimatedPulse;
    await this.todoTaskRepository.save(todo);
  }

  async updateTodoTitle(id: string, title: string): Promise<void> {
    const todo = await this.todoTaskRepository.findById(id);
    if (!todo) throw new Error("TodoTask not found");
    todo.title = title;
    await this.todoTaskRepository.save(todo);
  }

  async updateTodoDeadline(id: string, deadline: Date | null): Promise<void> {
    const todo = await this.todoTaskRepository.findById(id);
    if (!todo) throw new Error("TodoTask not found");
    todo.deadline = deadline;
    await this.todoTaskRepository.save(todo);
  }

  async updateTodoStatus(id: string, status: TodoTaskStatus): Promise<void> {
    const todo = await this.todoTaskRepository.findById(id);
    if (!todo) throw new Error("TodoTask not found");
    todo.status = status;
    await this.todoTaskRepository.save(todo);
  }

  async deleteTodoTask(id: string): Promise<void> {
    await this.todoTaskRepository.delete(id);
  }

  async assignTodoTaskToSprint(taskId: string, sprintId: string): Promise<void> {
    await this.todoTaskRepository.updateSprintId(taskId, sprintId);
  }

  async unassignTodoTaskFromSprint(taskId: string): Promise<void> {
    await this.todoTaskRepository.updateSprintId(taskId, null);
  }
}
