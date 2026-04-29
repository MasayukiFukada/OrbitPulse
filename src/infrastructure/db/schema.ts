import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sprints = sqliteTable("sprints", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  goal: text("goal"), // スプリントのWhy
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["planning", "active", "completed"] })
    .default("planning")
    .notNull(),
  retrospective: text("retrospective"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const capacities = sqliteTable("capacities", {
  id: text("id").primaryKey(),
  sprintId: text("sprint_id")
    .references(() => sprints.id)
    .notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  pulseCount: integer("pulse_count").default(4).notNull(), // 標準は4パルス
  note: text("note"),
});

export const backlogItems = sqliteTable("backlog_items", {
  id: text("id").primaryKey(),
  sprintId: text("sprint_id").references(() => sprints.id), // スプリントとの紐付け
  subject: text("subject").default("私").notNull(), // ユーザーストーリーの主語
  title: text("title").notNull(),
  description: text("description"),
  why: text("why").notNull(), // なぜ作るのか。本システムの肝！
  acceptanceCriteria: text("acceptance_criteria"), // 受け入れ条件
  storyPoints: integer("story_points").default(0),
  status: text("status", { enum: ["backlog", "todo", "doing", "done"] })
    .default("backlog")
    .notNull(),
  priority: integer("priority").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  backlogItemId: text("backlog_item_id")
    .references(() => backlogItems.id)
    .notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["todo", "doing", "done", "pooled"] })
    .default("todo")
    .notNull(),
  estimatedPulse: integer("estimated_pulse").default(0).notNull(),
  actualPulse: integer("actual_pulse").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export const todoTasks = sqliteTable("todo_tasks", {
  id: text("id").primaryKey(),
  sprintId: text("sprint_id").references(() => sprints.id), // 未定時はnull
  title: text("title").notNull(),
  status: text("status", { enum: ["todo", "doing", "done", "pooled"] })
    .default("todo")
    .notNull(),
  estimatedPulse: integer("estimated_pulse").default(0).notNull(),
  actualPulse: integer("actual_pulse").default(0).notNull(),
  deadline: integer("deadline", { mode: "timestamp" }),
  priority: integer("priority").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TodoTask = typeof todoTasks.$inferSelect;
export type NewTodoTask = typeof todoTasks.$inferInsert;
export type Sprint = typeof sprints.$inferSelect;
export type NewSprint = typeof sprints.$inferInsert;
export type Capacity = typeof capacities.$inferSelect;
export type NewCapacity = typeof capacities.$inferInsert;
export type BacklogItem = typeof backlogItems.$inferSelect;
export type NewBacklogItem = typeof backlogItems.$inferInsert;

export const burnDownSnapshots = sqliteTable("burn_down_snapshots", {
  id: text("id").primaryKey(),
  sprintId: text("sprint_id")
    .references(() => sprints.id)
    .notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  remainingPulse: integer("remaining_pulse").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

export type BurnDownSnapshot = typeof burnDownSnapshots.$inferSelect;
export type NewBurnDownSnapshot = typeof burnDownSnapshots.$inferInsert;
