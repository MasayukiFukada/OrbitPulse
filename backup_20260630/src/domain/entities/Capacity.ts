export class Capacity {
  constructor(
    public readonly id: string,
    public readonly sprintId: string,
    public date: Date,
    public pulseCount: number = 4,
    public note: string | null = null,
  ) {}
}
