import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';

// 移行用の簡易的な型定義
type OldTask = {
  id: string;
  title: string;
  status: string;
  estimatedPulse: number;
  actualPulse: number;
  createdAt: string;
  updatedAt: string;
};

type OldTodoTask = {
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

type OldBacklogItem = {
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
  tasks?: OldTask[];
};

type OldCapacity = {
  id: string;
  sprintId: string;
  date: string;
  pulseCount: number;
  note: string | null;
};

type OldSnapshot = {
  id: string;
  sprintId: string;
  date: string;
  remainingPulse: number;
  createdAt: string;
};

type OldSprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  retrospective: string | null;
  createdAt: string;
  updatedAt: string;
  todoTasks?: OldTodoTask[];
  backlogItems?: OldBacklogItem[];
  capacities?: OldCapacity[];
  snapshots?: OldSnapshot[];
};

type OldData = {
  sprints: OldSprint[];
  todoTasks?: OldTodoTask[];
  backlogItems?: OldBacklogItem[];
};

async function migrate() {
  const dbPath = path.join(__dirname, '../db.json');
  console.log(`Starting migration for ${dbPath}...`);

  if (!fs.existsSync(dbPath)) {
    console.error("db.json does not exist. Cannot migrate.");
    return;
  }

  const oldRaw = fs.readFileSync(dbPath, 'utf-8');
  const oldData: OldData = JSON.parse(oldRaw);

  const defaultCategory = {
    id: "default-category",
    name: "開発・作業",
    color: "#4f46e5"
  };

  const newData: any = {
    categories: [defaultCategory],
    recurringTasks: [],
    sprints: [],
    backlogItems: [],
    tasks: []
  };

  // 1. 未割当の backlogItems とその子 tasks の移行
  if (oldData.backlogItems) {
    for (const oldItem of oldData.backlogItems) {
      // 子タスクの移行
      if (oldItem.tasks) {
        for (const oldTask of oldItem.tasks) {
          newData.tasks.push({
            id: oldTask.id,
            sprintId: null,
            backlogItemId: oldItem.id,
            categoryId: defaultCategory.id,
            recurringTaskId: null,
            title: oldTask.title,
            status: oldTask.status,
            estimatedPulse: oldTask.estimatedPulse,
            actualPulse: oldTask.actualPulse,
            remainingPulse: oldTask.status === 'done' ? 0 : oldTask.estimatedPulse,
            deadline: null,
            priority: 0,
            createdAt: oldTask.createdAt,
            updatedAt: oldTask.updatedAt
          });
        }
      }

      // バックログ本体
      newData.backlogItems.push({
        id: oldItem.id,
        sprintId: null,
        categoryId: defaultCategory.id,
        subject: oldItem.subject,
        title: oldItem.title,
        why: oldItem.why,
        description: oldItem.description,
        acceptanceCriteria: oldItem.acceptanceCriteria,
        storyPoints: oldItem.storyPoints,
        status: oldItem.status,
        priority: oldItem.priority,
        createdAt: oldItem.createdAt,
        updatedAt: oldItem.updatedAt
      });
    }
  }

  // 2. 未割当の todoTasks の移行 (tasks へ統合)
  if (oldData.todoTasks) {
    for (const oldTodo of oldData.todoTasks) {
      newData.tasks.push({
        id: oldTodo.id,
        sprintId: null,
        backlogItemId: null,
        categoryId: defaultCategory.id,
        recurringTaskId: null,
        title: oldTodo.title,
        status: oldTodo.status,
        estimatedPulse: oldTodo.estimatedPulse,
        actualPulse: oldTodo.actualPulse,
        remainingPulse: oldTodo.status === 'done' ? 0 : oldTodo.estimatedPulse,
        deadline: oldTodo.deadline,
        priority: oldTodo.priority,
        createdAt: oldTodo.createdAt,
        updatedAt: oldTodo.updatedAt
      });
    }
  }

  // 3. sprints およびそれにネストされたデータの移行
  for (const oldSprint of oldData.sprints) {
    const sprintId = oldSprint.id;

    // スプリント内の backlogItems と子 tasks の移行
    if (oldSprint.backlogItems) {
      for (const oldItem of oldSprint.backlogItems) {
        if (oldItem.tasks) {
          for (const oldTask of oldItem.tasks) {
            newData.tasks.push({
              id: oldTask.id,
              sprintId: sprintId,
              backlogItemId: oldItem.id,
              categoryId: defaultCategory.id,
              recurringTaskId: null,
              title: oldTask.title,
              status: oldTask.status,
              estimatedPulse: oldTask.estimatedPulse,
              actualPulse: oldTask.actualPulse,
              remainingPulse: oldTask.status === 'done' ? 0 : oldTask.estimatedPulse,
              deadline: null,
              priority: 0,
              createdAt: oldTask.createdAt,
              updatedAt: oldTask.updatedAt
            });
          }
        }

        newData.backlogItems.push({
          id: oldItem.id,
          sprintId: sprintId,
          categoryId: defaultCategory.id,
          subject: oldItem.subject,
          title: oldItem.title,
          why: oldItem.why,
          description: oldItem.description,
          acceptanceCriteria: oldItem.acceptanceCriteria,
          storyPoints: oldItem.storyPoints,
          status: oldItem.status,
          priority: oldItem.priority,
          createdAt: oldItem.createdAt,
          updatedAt: oldItem.updatedAt
        });
      }
    }

    // スプリント内の todoTasks の移行 (tasks へ統合)
    if (oldSprint.todoTasks) {
      for (const oldTodo of oldSprint.todoTasks) {
        newData.tasks.push({
          id: oldTodo.id,
          sprintId: sprintId,
          backlogItemId: null,
          categoryId: defaultCategory.id,
          recurringTaskId: null,
          title: oldTodo.title,
          status: oldTodo.status,
          estimatedPulse: oldTodo.estimatedPulse,
          actualPulse: oldTodo.actualPulse,
          remainingPulse: oldTodo.status === 'done' ? 0 : oldTodo.estimatedPulse,
          deadline: oldTodo.deadline,
          priority: oldTodo.priority,
          createdAt: oldTodo.createdAt,
          updatedAt: oldTodo.updatedAt
        });
      }
    }

    // days 配列（カレンダー期間のキャパシティ・実績の集約）の構築
    const days: any[] = [];
    const current = new Date(oldSprint.startDate);
    const end = new Date(oldSprint.endDate);
    
    // 既存の capacities, snapshots をマップ化
    const capacityMap: { [date: string]: { count: number; note: string | null } } = {};
    if (oldSprint.capacities) {
      for (const cap of oldSprint.capacities) {
        // YYYY-MM-DD 文字列でマッピング
        const dStr = new Date(cap.date).toISOString().split('T')[0];
        capacityMap[dStr] = { count: cap.pulseCount, note: cap.note };
      }
    }

    const snapshotMap: { [date: string]: number } = {};
    if (oldSprint.snapshots) {
      for (const snap of oldSprint.snapshots) {
        const dStr = new Date(snap.date).toISOString().split('T')[0];
        snapshotMap[dStr] = snap.remainingPulse;
      }
    }

    let iterations = 0;
    while (current <= end && iterations < 100) {
      const dStr = current.toISOString().split('T')[0];
      const capInfo = capacityMap[dStr];
      const snapInfo = snapshotMap[dStr];

      days.push({
        date: current.toISOString(), // ISO String で保存
        capacity: capInfo ? capInfo.count : 4,
        remaining: snapInfo !== undefined ? snapInfo : null,
        note: capInfo ? capInfo.note : null
      });

      current.setDate(current.getDate() + 1);
      iterations++;
    }

    // スプリント本体
    newData.sprints.push({
      id: oldSprint.id,
      name: oldSprint.name,
      goal: oldSprint.goal,
      startDate: oldSprint.startDate,
      endDate: oldSprint.endDate,
      status: oldSprint.status,
      retrospective: oldSprint.retrospective,
      days: days,
      createdAt: oldSprint.createdAt,
      updatedAt: oldSprint.updatedAt
    });
  }

  // バックアップ作成と書き込み
  const backupPath = path.join(__dirname, '../db.json.bak');
  fs.writeFileSync(backupPath, oldRaw, 'utf-8');
  console.log(`Created raw JSON backup at ${backupPath}`);

  fs.writeFileSync(dbPath, JSON.stringify(newData, null, 2), 'utf-8');
  console.log("Migration completed successfully!");
}

migrate().catch(console.error);
