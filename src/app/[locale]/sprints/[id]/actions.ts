"use server";

import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { LowDbBacklogRepository } from "@/infrastructure/repositories/LowDbBacklogRepository";
import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { ManageSprintUseCase } from "@/application/use-cases/ManageSprintUseCase";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { revalidatePath } from "next/cache";
import { SprintStatus } from "@/domain/entities/Sprint";
import { TaskStatus } from "@/domain/entities/Task";

const sprintRepository = new LowDbSprintRepository();
const backlogRepository = new LowDbBacklogRepository();
const taskRepository = new LowDbTaskRepository();

const sprintUseCase = new ManageSprintUseCase(
  sprintRepository,
  backlogRepository,
  taskRepository,
);
const taskUseCase = new ManageTaskUseCase(taskRepository);

export async function updateCapacitiesAction(
  sprintId: string,
  capacitiesData: { date: Date | string; capacity: number; note?: string | null }[],
) {
  const sprint = await sprintRepository.findById(sprintId);
  if (!sprint) throw new Error("Sprint not found");

  sprint.days = sprint.days.map((day) => {
    const dStr = new Date(day.date).toISOString().split("T")[0];
    const match = capacitiesData.find(
      (c) => new Date(c.date).toISOString().split("T")[0] === dStr
    );
    if (match) {
      return {
        ...day,
        capacity: match.capacity,
        note: match.note || null,
      };
    }
    return day;
  });

  await sprintRepository.save(sprint);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function addItemToSprintAction(sprintId: string, itemId: string) {
  await sprintUseCase.addBacklogItemToSprint(sprintId, itemId);
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/backlog");
}

export async function removeItemFromSprintAction(
  sprintId: string,
  itemId: string,
) {
  await sprintUseCase.removeBacklogItemFromSprint(itemId);
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/backlog");
}

export async function updateSprintStatusAction(
  sprintId: string,
  status: SprintStatus,
) {
  const sprint = await sprintUseCase.getSprintById(sprintId);
  if (!sprint) return;

  await sprintUseCase.updateSprint(sprintId, {
    name: sprint.name,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: status,
  });
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/sprints");
}

export async function addTaskAction(
  sprintId: string,
  backlogItemId: string,
  title: string,
  estimatedPulse: number,
) {
  await taskUseCase.addTask({ sprintId, backlogItemId, title, estimatedPulse });
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskPulseAction(
  sprintId: string,
  taskId: string,
  actualPulse: number,
) {
  await taskUseCase.updateTaskPulse(taskId, actualPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskRemainingPulseAction(
  sprintId: string,
  taskId: string,
  remainingPulse: number,
) {
  await taskUseCase.updateTaskRemainingPulse(taskId, remainingPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskEstimatedPulseAction(
  sprintId: string,
  taskId: string,
  estimatedPulse: number,
) {
  await taskUseCase.updateTaskEstimatedPulse(taskId, estimatedPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskTitleAction(
  sprintId: string,
  taskId: string,
  title: string,
) {
  await taskUseCase.updateTaskTitle(taskId, title);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTaskStatusAction(
  sprintId: string,
  taskId: string,
  status: TaskStatus,
) {
  await taskUseCase.updateTaskStatus(taskId, status);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function deleteTaskAction(sprintId: string, taskId: string) {
  await taskUseCase.deleteTask(taskId);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function addTodoTaskAction(
  sprintId: string,
  title: string,
  estimatedPulse: number,
  deadline: Date | null = null,
) {
  await taskUseCase.addTask({ sprintId, backlogItemId: null, title, estimatedPulse, deadline });
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoDeadlineAction(
  sprintId: string,
  taskId: string,
  deadline: Date | null,
) {
  await taskUseCase.updateTaskDeadline(taskId, deadline);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoPulseAction(
  sprintId: string,
  taskId: string,
  actualPulse: number,
) {
  await taskUseCase.updateTaskPulse(taskId, actualPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoEstimatedPulseAction(
  sprintId: string,
  taskId: string,
  estimatedPulse: number,
) {
  await taskUseCase.updateTaskEstimatedPulse(taskId, estimatedPulse);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoTitleAction(
  sprintId: string,
  taskId: string,
  title: string,
) {
  await taskUseCase.updateTaskTitle(taskId, title);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function updateTodoStatusAction(
  sprintId: string,
  taskId: string,
  status: TaskStatus,
) {
  await taskUseCase.updateTaskStatus(taskId, status);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function deleteTodoTaskAction(sprintId: string, taskId: string) {
  await taskUseCase.deleteTask(taskId);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function assignTodoTaskToSprintAction(
  sprintId: string,
  taskId: string,
) {
  await taskUseCase.assignTaskToSprint(taskId, sprintId);
  revalidatePath(`/sprints/${sprintId}`);
}

export async function unassignTodoTaskFromSprintAction(
  sprintId: string,
  taskId: string,
) {
  await taskUseCase.unassignTaskFromSprint(taskId);
  revalidatePath(`/sprints/${sprintId}`);
}

