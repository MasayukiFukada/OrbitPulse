import { Task, TaskStatus } from "@/domain/entities/Task";
import { TaskRepository } from "@/domain/repositories/TaskRepository";
import { nanoid } from "nanoid";

export class ManageTaskUseCase {
  constructor(private taskRepository: TaskRepository) {}

  async getTasks(): Promise<Task[]> {
    return this.taskRepository.findAll();
  }

  async getTasksByBacklogItem(backlogItemId: string): Promise<Task[]> {
    return this.taskRepository.findByBacklogItemId(backlogItemId);
  }

  async getSprintTasks(sprintId: string): Promise<Task[]> {
    return this.taskRepository.findBySprintId(sprintId);
  }

  async getPooledTasks(): Promise<Task[]> {
    return this.taskRepository.findPooled();
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.taskRepository.findById(id);
  }

  async addTask(data: {
    title: string;
    sprintId?: string | null;
    backlogItemId?: string | null;
    categoryId?: string | null;
    recurringTaskId?: string | null;
    estimatedPulse?: number;
    deadline?: Date | null;
    priority?: number;
  }): Promise<Task> {
    const est = data.estimatedPulse || 0;
    const task = new Task(
      nanoid(),
      data.title,
      data.backlogItemId ? "todo" : (data.sprintId ? "todo" : "pooled"),
      data.sprintId || null,
      data.backlogItemId || null,
      data.categoryId || null,
      data.recurringTaskId || null,
      est,
      0,
      est,
      data.deadline || null,
      data.priority || 0,
    );
    await this.taskRepository.save(task);
    return task;
  }

  async updateTaskPulse(id: string, actualPulse: number, remainingPulse?: number): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.actualPulse = actualPulse;
    if (remainingPulse !== undefined) {
      task.remainingPulse = remainingPulse;
    }
    await this.taskRepository.save(task);
  }

  async updateTaskRemainingPulse(id: string, remainingPulse: number): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.remainingPulse = remainingPulse;
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
    if (status === "done") {
      task.remainingPulse = 0;
    } else if (task.remainingPulse === 0) {
      task.remainingPulse = Math.max(0, task.estimatedPulse - task.actualPulse);
    }
    await this.taskRepository.save(task);
  }

  async updateTaskDeadline(id: string, deadline: Date | null): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.deadline = deadline;
    await this.taskRepository.save(task);
  }

  async updateTaskPriority(id: string, priority: number): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.priority = priority;
    await this.taskRepository.save(task);
  }

  async assignTaskToSprint(id: string, sprintId: string): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.sprintId = sprintId;
    if (task.status === "pooled") {
      task.status = "todo";
    }
    await this.taskRepository.save(task);
  }

  async unassignTaskFromSprint(id: string): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.sprintId = null;
    if (!task.backlogItemId) {
      task.status = "pooled";
    }
    await this.taskRepository.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.taskRepository.delete(id);
  }

  async updateTask(
    id: string,
    data: {
      title: string;
      sprintId: string | null;
      backlogItemId: string | null;
      categoryId: string | null;
      estimatedPulse: number;
      deadline: Date | null;
      priority: number;
      status?: TaskStatus;
    }
  ): Promise<void> {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new Error("Task not found");

    task.title = data.title;
    task.sprintId = data.sprintId;
    task.backlogItemId = data.backlogItemId;
    task.categoryId = data.categoryId;
    
    const oldEst = task.estimatedPulse;
    task.estimatedPulse = data.estimatedPulse;
    if (task.status === "done") {
      task.remainingPulse = 0;
    } else {
      task.remainingPulse = Math.max(0, task.remainingPulse + (data.estimatedPulse - oldEst));
    }

    task.deadline = data.deadline;
    task.priority = data.priority;
    if (data.status !== undefined) {
      task.status = data.status;
    } else if (task.sprintId && task.status === "pooled") {
      task.status = "todo";
    } else if (!task.sprintId && !task.backlogItemId) {
      task.status = "pooled";
    }

    await this.taskRepository.save(task);
  }

  // イグナイトガチャ候補テンプレートの取得
  async getIgniteTemplates(): Promise<Task[]> {
    const all = await this.taskRepository.findAll();
    return all.filter(t => t.categoryId === "ignite-gacha" && !t.id.startsWith("ignite-active-"));
  }

  // 今日の進行中（doing）のイグナイト実行タスクの取得
  async getIgniteActiveTask(): Promise<Task | null> {
    const all = await this.taskRepository.findAll();
    const todayStr = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
    
    // 今日のイグナイトタスクで、かつ「作業中(doing)」のものを探す
    const found = all.find(t => {
      if (t.categoryId !== "ignite-gacha" || !t.id.startsWith("ignite-active-") || t.status !== "doing") {
        return false;
      }
      const tDateStr = t.createdAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
      return tDateStr === todayStr;
    });

    return found || null;
  }

  // 古い一時タスクを自動クリーンアップ（削除）
  async cleanUpIgniteTasks(): Promise<void> {
    const all = await this.taskRepository.findAll();
    const todayStr = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });

    for (const t of all) {
      if (t.categoryId === "ignite-gacha" && t.id.startsWith("ignite-active-")) {
        const tDateStr = t.createdAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
        if (tDateStr !== todayStr) {
          await this.taskRepository.delete(t.id);
        }
      }
    }
  }

  // 新規ガチャ候補の作成
  async addIgniteTemplate(title: string, priority: number): Promise<Task> {
    const task = new Task(
      nanoid(),
      title,
      "pooled",
      null,
      null,
      "ignite-gacha",
      null,
      0, // 見積Pulseは0固定
      0,
      0, // 残りPulseも0固定
      null,
      priority // 0: Common, 1: Rare, 2: Super Rare, 3: Ultra Rare
    );
    await this.taskRepository.save(task);
    return task;
  }

  // ガチャを引いて一時実行タスクを作成する
  async drawIgniteGacha(sprintId: string | null): Promise<Task | null> {
    // まずクリーンアップを実行
    await this.cleanUpIgniteTasks();

    // 既に進行中のイグナイトタスクがあれば、新しいガチャは引かずにそれを返す
    const active = await this.getIgniteActiveTask();
    if (active) return active;

    const all = await this.taskRepository.findAll();
    const templates = await this.getIgniteTemplates();
    if (templates.length === 0) return null;

    // 重複回避：今日既に引いたイグナイトタスクのタイトル一覧を取得
    const todayStr = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
    const todayTasks = all.filter(t => {
      if (t.categoryId !== "ignite-gacha" || !t.id.startsWith("ignite-active-")) {
        return false;
      }
      const tDateStr = t.createdAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
      return tDateStr === todayStr;
    });
    const todayTitles = todayTasks.map(t => t.title);

    // 今日すでに引いたタスクを除外して候補を絞り込む
    let availableTemplates = templates.filter(t => !todayTitles.includes(t.title));

    // 全てのテンプレートを引き尽くした場合は、全候補を対象にする（フォールバック）
    if (availableTemplates.length === 0) {
      availableTemplates = templates;
    }

    // レアリティの抽選 (C: 50%, R: 30%, SR: 15%, SSR: 5%)
    const rand = Math.random() * 100;
    let targetRarity = 0; // Common
    if (rand < 5) {
      targetRarity = 3; // SSR
    } else if (rand < 20) {
      targetRarity = 2; // SR
    } else if (rand < 50) {
      targetRarity = 1; // R
    } else {
      targetRarity = 0; // C
    }

    // 指定レアリティのテンプレートを集める
    let candidates = availableTemplates.filter(t => t.priority === targetRarity);

    // もしそのレアリティの候補がなければ、絞り込んだ候補全体からランダムに選ぶ
    if (candidates.length === 0) {
      candidates = availableTemplates;
    }

    // ランダムに1件選択
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // 一時タスクを生成して保存
    const activeTask = new Task(
      `ignite-active-${nanoid()}`,
      chosen.title,
      "doing", // 初期ステータスを進行中にしておく
      sprintId, // 引数で渡されたスプリントIDを設定
      null,
      "ignite-gacha",
      null,
      0, // 見積Pulseは0固定
      0,
      0, // 残りPulseも0固定
      null,
      chosen.priority,
      new Date(), // createdAt
      new Date()  // updatedAt
    );

    await this.taskRepository.save(activeTask);
    return activeTask;
  }
}

