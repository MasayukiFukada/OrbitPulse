export type TaskStatus = "todo" | "doing" | "done" | "pooled";

export class Task {
  constructor(
    public readonly id: string,
    public title: string,
    public status: TaskStatus = "todo",
    public sprintId: string | null = null,
    public backlogItemId: string | null = null,
    public categoryId: string | null = null,
    public recurringTaskId: string | null = null,
    public estimatedPulse: number = 0, // 当初見積（初期見積）
    public actualPulse: number = 0,    // 実績
    public remainingPulse: number = 0, // 残り見積
    public deadline: Date | null = null,
    public priority: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  isDone(): boolean {
    return this.status === "done";
  }
}

