export class BurnDownSnapshot {
  constructor(
    public readonly id: string,
    public readonly sprintId: string,
    public readonly date: Date,
    public remainingPulse: number, // 去掉 readonly，允许更新
    public readonly createdAt: Date = new Date()
  ) {}
}
