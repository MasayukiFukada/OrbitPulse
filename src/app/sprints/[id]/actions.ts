"use server";

import { SqliteSprintRepository } from "@/infrastructure/repositories/SqliteSprintRepository";
import { SqliteCapacityRepository } from "@/infrastructure/repositories/SqliteCapacityRepository";
import { SqliteBacklogRepository } from "@/infrastructure/repositories/SqliteBacklogRepository";
import { SqliteTaskRepository } from "@/infrastructure/repositories/SqliteTaskRepository";
import { SqliteTodoTaskRepository } from "@/infrastructure/repositories/SqliteTodoTaskRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { ManageTodoUseCase } from "@/application/use-cases/ManageTodoUseCase";
import { revalidatePath } from "next/cache";
import { Capacity } from "@/domain/entities/Capacity";
import { TaskStatus } from "@/domain/entities/Task";
import { TodoTaskStatus } from "@/domain/entities/TodoTask";

const sprintRepository = new SqliteSprintRepository();
const capacityRepository = new SqliteCapacityRepository();
const backlogRepository = new SqliteBacklogRepository();
const taskRepository = new SqliteTaskRepository();
const todoTaskRepository = new SqliteTodoTaskRepository();

const sprintUseCase = new ManageSprintUseCase(sprintRepository, capacityRepository, backlogRepository);
const taskUseCase = new ManageTaskUseCase(taskRepository);
const todoUseCase = new ManageTodoUseCase(todoTaskRepository);

export async function updateCapacitiesAction(sprintId: string, capacitiesData: any[]) {
  const capacities = capacitiesData.map(c => new Capacity(c.id, c.sprintId, new Date(c.date), c.pulseCount, c.note));
  await sprintUseCase.updateCapacities(capacities);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function addItemToSprintAction(sprintId: string, itemId: string) {
  await sprintUseCase.addBacklogItemToSprint(sprintId, itemId);
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/backlog");
}

export async function removeItemFromSprintAction(sprintId: string, itemId: string) {
  await sprintUseCase.removeBacklogItemFromSprint(itemId);
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/backlog");
}

export async function updateSprintStatusAction(sprintId: string, status: any) {
  const sprint = await sprintUseCase.getSprintById(sprintId);
  if (!sprint) return;
  
  await sprintUseCase.updateSprint(sprintId, {
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: status
  });
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/sprints");
}

export async function addTaskAction(sprintId: string, backlogItemId: string, title: string, estimatedPulse: number) {
  await taskUseCase.addTask({ backlogItemId, title, estimatedPulse });
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskPulseAction(sprintId: string, taskId: string, actualPulse: number) {
  await taskUseCase.updateTaskPulse(taskId, actualPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskEstimatedPulseAction(sprintId: string, taskId: string, estimatedPulse: number) {
  await taskUseCase.updateTaskEstimatedPulse(taskId, estimatedPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskTitleAction(sprintId: string, taskId: string, title: string) {
  await taskUseCase.updateTaskTitle(taskId, title);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskStatusAction(sprintId: string, taskId: string, status: TaskStatus) {
  await taskUseCase.updateTaskStatus(taskId, status);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function deleteTaskAction(sprintId: string, taskId: string) {
  await taskUseCase.deleteTask(taskId);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function addTodoTaskAction(sprintId: string, title: string, estimatedPulse: number, deadline: Date | null = null) {
  await todoUseCase.addTodoTask({ sprintId, title, estimatedPulse, deadline });
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoDeadlineAction(sprintId: string, taskId: string, deadline: Date | null) {
  await todoUseCase.updateTodoDeadline(taskId, deadline);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoPulseAction(sprintId: string, taskId: string, actualPulse: number) {
  await todoUseCase.updateTodoPulse(taskId, actualPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoEstimatedPulseAction(sprintId: string, taskId: string, estimatedPulse: number) {
  await todoUseCase.updateTodoEstimatedPulse(taskId, estimatedPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoTitleAction(sprintId: string, taskId: string, title: string) {
  await todoUseCase.updateTodoTitle(taskId, title);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoStatusAction(sprintId: string, taskId: string, status: TodoTaskStatus) {
  await todoUseCase.updateTodoStatus(taskId, status);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function deleteTodoTaskAction(sprintId: string, taskId: string) {
  await todoUseCase.deleteTodoTask(taskId);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function assignTodoTaskToSprintAction(sprintId: string, taskId: string) {
  await todoUseCase.assignTodoTaskToSprint(taskId, sprintId);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function unassignTodoTaskFromSprintAction(sprintId: string, taskId: string) {
  await todoUseCase.unassignTodoTaskFromSprint(taskId);
  revalidatePath(`/sprints/${sprintId}`);
}
