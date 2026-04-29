export type SprintStatus = "planning" | "active" | "completed";

export class Sprint {
  constructor(
    public readonly id: string,
    public name: string,
    public startDate: Date,
    public endDate: Date,
    public goal: string | null = null,
    public status: SprintStatus = "planning",
    public retrospective: string | null = null,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  isActive(): boolean {
    return this.status === "active";
  }

  isCompleted(): boolean {
    return this.status === "completed";
  }
}
