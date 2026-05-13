import { JSONFilePreset } from 'lowdb/node';

export type RawSprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  retrospective: string | null;
  createdAt: string;
  updatedAt: string;
  todoTasks: RawTodoTask[];
  backlogItems: RawBacklogItem[];
  capacities: RawCapacity[];
  snapshots: RawSnapshot[];
};

export type RawTodoTask = {
  id: string;
  title: string;
  sprintId: string | null;
  status: string;
  estimatedPulse: number;
  actualPulse: number;
  deadline: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type RawBacklogItem = {
  id: string;
  subject: string;
  title: string;
  why: string;
  description: string | null;
  acceptanceCriteria: string | null;
  storyPoints: number;
  status: string;
  sprintId: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
  tasks: RawTask[];
};

export type RawTask = {
  id: string;
  backlogItemId: string;
  title: string;
  status: string;
  estimatedPulse: number;
  actualPulse: number;
  createdAt: string;
  updatedAt: string;
};

export type RawCapacity = {
  id: string;
  sprintId: string;
  date: string;
  pulseCount: number;
  note: string | null;
};

export type RawSnapshot = {
  id: string;
  sprintId: string;
  date: string;
  remainingPulse: number;
  createdAt: string;
};

// JSONデータ全体の型定義
export type Data = {
  sprints: RawSprint[];
  todoTasks: RawTodoTask[]; // 未割当
  backlogItems: RawBacklogItem[]; // 未割当
};

const defaultData: Data = {
  sprints: [],
  todoTasks: [],
  backlogItems: [],
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

