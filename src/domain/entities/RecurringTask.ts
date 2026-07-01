export type RecurringPattern = "daily" | "weekly" | "monthly";

export class RecurringTask {
  constructor(
    public readonly id: string,
    public categoryId: string,
    public title: string,
    public pattern: RecurringPattern,
    public patternValue: string, // 曜日(1-7)や日付など
    public estimatedPulse: number,
  ) {}
}
