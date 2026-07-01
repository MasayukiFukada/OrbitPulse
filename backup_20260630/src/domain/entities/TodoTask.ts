export type TodoTaskStatus = "todo" | "doing" | "done" | "pooled";

export class TodoTask {
  constructor(
    public readonly id: string,
    public title: string,
    public sprintId: string | null = null,
    public status: TodoTaskStatus = "todo",
    public estimatedPulse: number = 0,
    public actualPulse: number = 0,
    public deadline: Date | null = null,
    public priority: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}
}
