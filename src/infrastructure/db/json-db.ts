import { JSONFilePreset } from 'lowdb/node';

export type RawCategory = {
  id: string;
  name: string;
  color: string;
};

export type RawRecurringTask = {
  id: string;
  categoryId: string;
  title: string;
  pattern: 'daily' | 'weekly' | 'monthly';
  patternValue: string;
  estimatedPulse: number;
};

export type RawSprintDay = {
  date: string;            // YYYY-MM-DD
  capacity: number;
  remaining: number | null;
  note: string | null;
};

export type RawSprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  retrospective: string | null;
  days: RawSprintDay[];
  createdAt: string;
  updatedAt: string;
};

export type RawBacklogItem = {
  id: string;
  sprintId: string | null;
  categoryId: string | null;
  subject: string;
  title: string;
  why: string;
  description: string | null;
  acceptanceCriteria: string | null;
  storyPoints: number;
  status: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type RawTask = {
  id: string;
  sprintId: string | null;
  backlogItemId: string | null;
  categoryId: string | null;
  recurringTaskId: string | null;
  title: string;
  status: string;
  estimatedPulse: number;
  actualPulse: number;
  remainingPulse: number;
  deadline: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

// JSONデータ全体の型定義
export type Data = {
  categories: RawCategory[];
  recurringTasks: RawRecurringTask[];
  sprints: RawSprint[];
  backlogItems: RawBacklogItem[];
  tasks: RawTask[];
};

const defaultData: Data = {
  categories: [],
  recurringTasks: [],
  sprints: [],
  backlogItems: [],
  tasks: [],
};

let dbInstance: Awaited<ReturnType<typeof JSONFilePreset<Data>>> | null = null;

// シングルトンとしてDBインスタンスを管理する関数
export async function getDb() {
  if (dbInstance) return dbInstance;

  // 開発・実行環境に合わせてファイルパスを調整
  const dbPath = process.env.DB_PATH || 'db.json';
  dbInstance = await JSONFilePreset<Data>(dbPath, defaultData);
  return dbInstance;
}


