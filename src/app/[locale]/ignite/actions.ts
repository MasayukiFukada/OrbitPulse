"use server";

import { LowDbTaskRepository } from "@/infrastructure/repositories/LowDbTaskRepository";
import { LowDbSprintRepository } from "@/infrastructure/repositories/LowDbSprintRepository";
import { ManageTaskUseCase } from "@/application/use-cases/ManageTaskUseCase";
import { revalidatePath } from "next/cache";

const taskRepository = new LowDbTaskRepository();
const sprintRepository = new LowDbSprintRepository();
const useCase = new ManageTaskUseCase(taskRepository);

// ガチャを引く
export async function drawIgniteGachaAction() {
  // 現在アクティブなスプリントのIDを取得する
  const sprints = await sprintRepository.findAll();
  const activeSprint = sprints.find(s => s.status === "active");
  const sprintId = activeSprint ? activeSprint.id : null;

  const task = await useCase.drawIgniteGacha(sprintId);
  
  revalidatePath("/");
  revalidatePath("/sprints");
  revalidatePath("/ignite");
  if (sprintId) {
    revalidatePath(`/sprints/${sprintId}`);
  }
  
  if (task) {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      estimatedPulse: task.estimatedPulse,
      priority: task.priority,
      createdAt: task.createdAt.toISOString()
    };
  }
  return null;
}

// 今日アクティブなイグナイトタスクを取得する
export async function getIgniteActiveTaskAction() {
  const task = await useCase.getIgniteActiveTask();
  if (task) {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      estimatedPulse: task.estimatedPulse,
      priority: task.priority,
      createdAt: task.createdAt.toISOString()
    };
  }
  return null;
}

// イグナイトタスクのポモドーロ完了処理（実績+1、完了状態にする）
export async function completeIgniteTaskAction(taskId: string) {
  const task = await useCase.getTaskById(taskId);
  if (!task) return;

  // 実績Pulseを+1し、イグナイトタスクなのでその時点で「完了(done)」にし、残り見積を0にする
  await useCase.updateTask(taskId, {
    title: task.title,
    sprintId: task.sprintId,
    backlogItemId: task.backlogItemId,
    categoryId: task.categoryId,
    estimatedPulse: task.estimatedPulse,
    deadline: task.deadline,
    priority: task.priority,
    status: "done"
  });

  // イグナイトは完了時に実績Pulseを0にする
  await useCase.updateTaskPulse(taskId, 0, 0);

  revalidatePath("/");
  revalidatePath("/sprints");
  revalidatePath("/ignite");
}

// クリーンアップを実行する
export async function cleanUpIgniteTasksAction() {
  await useCase.cleanUpIgniteTasks();
  revalidatePath("/");
  revalidatePath("/ignite");
}

// グローバルなポモドーロ完了処理（タスクIDベースでの実績+1）
// これをここに置いておけば、レイアウトの共通タイマーから呼び出せる
export async function completeGlobalPomodoroAction(taskId: string) {
  // もしイグナイトタスクならイグナイト用の完了処理を呼ぶ
  if (taskId.startsWith("ignite-active-")) {
    await completeIgniteTaskAction(taskId);
    return;
  }

  // 通常タスクの場合の実績Pulse加算
  const task = await useCase.getTaskById(taskId);
  if (task) {
    const nextActual = task.actualPulse + 1;
    // 残見積を自動で調整 (1減らす。ただし下限は0)
    const nextRemaining = Math.max(0, task.remainingPulse - 1);
    
    await useCase.updateTaskPulse(taskId, nextActual, nextRemaining);
    
    // もし残見積が0になったら自動で完了状態にするか？
    // 既存の挙動に合わせるため、ステータスはそのまま（またはユーザー自身でカンバン移動）
    
    revalidatePath("/");
    revalidatePath("/sprints");
    if (task.sprintId) {
      revalidatePath(`/sprints/${task.sprintId}`);
    }
  }
}
