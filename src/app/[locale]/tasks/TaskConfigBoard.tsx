"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction
} from "./actions";
import styles from "./page.module.css";
import { TaskStatus } from "@/domain/entities/Task";

interface CategoryData {
  id: string;
  name: string;
  color: string;
}

interface BacklogItemData {
  id: string;
  title: string;
  subject: string;
}

interface SprintData {
  id: string;
  name: string;
  status: string;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  sprintId: string | null;
  backlogItemId: string | null;
  categoryId: string | null;
  recurringTaskId: string | null;
  estimatedPulse: number;
  actualPulse: number;
  remainingPulse: number;
  deadline: string | null;
  priority: number;
}

interface TaskConfigBoardProps {
  initialTasks: TaskData[];
  backlogItems: BacklogItemData[];
  categories: CategoryData[];
  sprints: SprintData[];
}

export default function TaskConfigBoard({
  initialTasks,
  backlogItems,
  categories,
  sprints
}: TaskConfigBoardProps) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");

  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [filterUncompleted, setFilterUncompleted] = useState(true);

  // 編集クリックハンドラ
  const handleEditClick = (task: TaskData) => {
    setEditingTask(task);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  // 日付文字列を YYYY-MM-DD にパース
  const formatDateForInput = (dateStr: string | null) => {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  };

  // フィルター処理
  const filteredTasks = initialTasks.filter(task => {
    if (task.categoryId === "ignite-gacha") {
      return false; // イグナイトガチャ用タスクは除外
    }
    if (filterUncompleted && task.status === "done") {
      return false;
    }
    return true;
  });

  // プロダクトタスクと単発ToDoタスクに分ける
  const productTasks = filteredTasks.filter(task => task.backlogItemId !== null);
  const todoTasks = filteredTasks.filter(task => task.backlogItemId === null);

  // プロダクトタスクをバックログ項目ごとにグルーピング
  const backlogGroupMap: { [key: string]: TaskData[] } = {};
  productTasks.forEach(task => {
    const key = task.backlogItemId || "orphan";
    if (!backlogGroupMap[key]) {
      backlogGroupMap[key] = [];
    }
    backlogGroupMap[key].push(task);
  });

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t("title")}</h1>
        <label className={styles.filterLabel}>
          <input
            type="checkbox"
            checked={filterUncompleted}
            onChange={(e) => setFilterUncompleted(e.target.checked)}
          />
          <span>未完了のみ表示</span>
        </label>
      </div>

      <div className={styles.flexLayout}>
        {/* --- Left Column: Task Lists --- */}
        <div className={styles.listColumn}>
          {/* 1. Product Backlog Tasks Group */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("productTasksSection")}</h2>
            
            {productTasks.length === 0 ? (
              <p className={styles.empty}>{t("noTasks")}</p>
            ) : (
              Object.keys(backlogGroupMap).map(backlogId => {
                const backlog = backlogItems.find(b => b.id === backlogId);
                const backlogTitle = backlog
                  ? `${backlog.subject}は${backlog.title}`
                  : "不明なバックログ";
                
                return (
                  <div key={backlogId} className={styles.backlogGroup}>
                    <h4 className={styles.backlogGroupTitle}>📁 {backlogTitle}</h4>
                    <div className={styles.cardList}>
                      {backlogGroupMap[backlogId].map(task => {
                        const sprint = sprints.find(s => s.id === task.sprintId);
                        const category = categories.find(c => c.id === task.categoryId);
                        return (
                          <TaskCard
                            key={task.id}
                            task={task}
                            sprintName={sprint ? sprint.name : null}
                            category={category || null}
                            onEditClick={() => handleEditClick(task)}
                            onDeleteClick={() => {
                              if (confirm(t("deleteConfirm"))) {
                                deleteTaskAction(task.id, task.sprintId);
                              }
                            }}
                            t={t}
                            tc={tc}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* 2. General ToDo Tasks Group */}
          <section className={styles.section} style={{ marginTop: "2rem" }}>
            <h2 className={styles.sectionTitle}>{t("todoTasksSection")}</h2>
            <div className={styles.cardList}>
              {todoTasks.length === 0 ? (
                <p className={styles.empty}>{t("noTasks")}</p>
              ) : (
                todoTasks.map(task => {
                  const sprint = sprints.find(s => s.id === task.sprintId);
                  const category = categories.find(c => c.id === task.categoryId);
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      sprintName={sprint ? sprint.name : null}
                      category={category || null}
                      onEditClick={() => handleEditClick(task)}
                      onDeleteClick={() => {
                        if (confirm(t("deleteConfirm"))) {
                          deleteTaskAction(task.id, task.sprintId);
                        }
                      }}
                      t={t}
                      tc={tc}
                    />
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* --- Right Column: Form Container --- */}
        <div className={styles.formColumn}>
          <div className={styles.stickyForm}>
            <form
              action={async (formData) => {
                if (editingTask) {
                  await updateTaskAction(editingTask.id, formData);
                  handleCancelEdit();
                } else {
                  await createTaskAction(formData);
                }
              }}
              className={styles.form}
            >
              <h3 className={styles.formTitle}>
                {editingTask ? t("editTask") : t("createTask")}
              </h3>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("taskTitle")}</label>
                <input
                  name="title"
                  required
                  defaultValue={editingTask?.title || ""}
                  placeholder="e.g. ドキュメントを作成"
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("backlogItemLabel")}</label>
                <select
                  name="backlogItemId"
                  defaultValue={editingTask?.backlogItemId || ""}
                  className={styles.select}
                >
                  <option value="">{t("none")}</option>
                  {backlogItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.subject}は{item.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("categoryLabel")}</label>
                  <select
                    name="categoryId"
                    defaultValue={editingTask?.categoryId || "default-category"}
                    className={styles.select}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("estimatedPulse")}</label>
                  <input
                    name="estimatedPulse"
                    type="number"
                    min="0"
                    required
                    defaultValue={editingTask?.estimatedPulse ?? 1}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("sprintLabel")}</label>
                <select
                  name="sprintId"
                  defaultValue={editingTask?.sprintId || ""}
                  className={styles.select}
                >
                  <option value="">{t("sprintNone")}</option>
                  {sprints.filter(s => s.status !== "completed").map(sprint => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name} ({sprint.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("deadlineLabel")}</label>
                  <input
                    name="deadline"
                    type="date"
                    defaultValue={formatDateForInput(editingTask?.deadline || null)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("priorityLabel")}</label>
                  <input
                    name="priority"
                    type="number"
                    required
                    defaultValue={editingTask?.priority ?? 0}
                    className={styles.input}
                  />
                </div>
              </div>

              {editingTask && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("statusLabel")}</label>
                  <select
                    name="status"
                    defaultValue={editingTask.status}
                    className={styles.select}
                  >
                    <option value="todo">TODO (未着手)</option>
                    <option value="doing">DOING (着手)</option>
                    <option value="pooled">POOLED (プール)</option>
                    <option value="done">DONE (完了)</option>
                  </select>
                </div>
              )}

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.submitBtn}>
                  {editingTask ? tc("update") : tc("create")}
                </button>
                {editingTask && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={styles.cancelBtn}
                  >
                    {tc("cancel")}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  sprintName,
  category,
  onEditClick,
  onDeleteClick,
  t,
  tc
}: {
  task: TaskData;
  sprintName: string | null;
  category: CategoryData | null;
  onEditClick: () => void;
  onDeleteClick: () => void;
  t: any;
  tc: any;
}) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "done": return styles.statusDone;
      case "doing": return styles.statusDoing;
      case "todo": return styles.statusTodo;
      default: return styles.statusPooled;
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <div className={styles.cardHeaderRow}>
          <h3 className={styles.cardTitle}>{task.title}</h3>
          <span className={`${styles.statusBadge} ${getStatusClass(task.status)}`}>
            {task.status.toUpperCase()}
          </span>
          {category && (
            <span
              className={styles.categoryBadge}
              style={{
                backgroundColor: `${category.color}15`,
                color: category.color,
                border: `1px solid ${category.color}35`
              }}
            >
              {category.name}
            </span>
          )}
        </div>
        <div className={styles.taskMeta}>
          <span className={styles.sprintInfo}>
            🏃‍♂️ {sprintName ? t("sprintAssigned", { name: sprintName }) : t("unassigned")}
          </span>
          <span className={styles.pulseEst}>
            ⚡ {task.estimatedPulse} Pulse (実績: {task.actualPulse} / 残: {task.remainingPulse})
          </span>
          {task.deadline && (
            <span className={styles.deadlineInfo}>
              📅 {task.deadline.split("T")[0]}
            </span>
          )}
        </div>
      </div>
      <div className={styles.cardActions}>
        <button onClick={onEditClick} className={styles.editBtn}>
          {tc("edit")}
        </button>
        <button onClick={onDeleteClick} className={styles.deleteBtn}>
          {tc("delete")}
        </button>
      </div>
    </div>
  );
}
