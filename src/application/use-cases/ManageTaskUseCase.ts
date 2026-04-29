import { Task, TaskStatus } from "@/domain/entities/Task";
import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { nanoid } from "nanoid";

export class ManageTaskUseCase {
  constructor(private taskRepository: TaskRepository) {}

  async getTasksByBacklogItem(backlogItemId: string): Promise<Task[]> {
    return this.taskRepository.findByBacklogItemId(backlogItemId);
  }

  async addTask(data: {
    backlogItemId: string;
    title: string;
    estimatedPulse?: number;
  }): Promise<Task> {
    const task = new Task(
      nanoid(),
      data.backlogItemId,
      data.title,
      "todo",
      data.estimatedPulse || 0,
      0
    );
    await this.taskRepository.save(task);
    return task;
  }

  async updateTaskPulse(id: string, actualPulse: number): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.actualPulse = actualPulse;
    await this.taskRepository.save(task);
  }

  async updateTaskEstimatedPulse(id: string, estimatedPulse: number): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.estimatedPulse = estimatedPulse;
    await this.taskRepository.save(task);
  }

  async updateTaskTitle(id: string, title: string): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.title = title;
    await this.taskRepository.save(task);
  }

  async updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.status = status;
    await this.taskRepository.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.taskRepository.delete(id);
  }
}
