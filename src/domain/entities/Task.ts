export type TaskStatus = "todo" | "doing" | "done" | "pooled";

export class Task {
  constructor(
    public readonly id: string,
    public readonly backlogItemId: string,
    public title: string,
    public status: TaskStatus = "todo",
    public estimatedPulse: number = 0,
    public actualPulse: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  isDone(): boolean {
    return this.status === "done";
  }
}
