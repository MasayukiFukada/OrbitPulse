export type BacklogItemStatus = "backlog" | "todo" | "doing" | "done";

export class BacklogItem {
  constructor(
    public readonly id: string,
    public subject: string = "私",
    public title: string,
    public why: string,
    public description: string | null = null,
    public acceptanceCriteria: string | null = null,
    public storyPoints: number = 0,
    public status: BacklogItemStatus = "backlog",
    public sprintId: string | null = null,
    public priority: number = 0,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {}

  // 必要に応じてドメインロジック（ステータス遷移のバリデーションとか）をここに追加する
}
