"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  addItemToSprintAction,
  removeItemFromSprintAction,
  updateSprintStatusAction,
  addTaskAction,
  updateTaskPulseAction,
  updateTaskEstimatedPulseAction,
  updateTaskTitleAction,
  updateTaskStatusAction,
  deleteTaskAction,
  addTodoTaskAction,
  updateTodoPulseAction,
  updateTodoEstimatedPulseAction,
  updateTodoTitleAction,
  updateTodoStatusAction,
  deleteTodoTaskAction,
  updateTodoDeadlineAction,
  assignTodoTaskToSprintAction,
  unassignTodoTaskFromSprintAction,
} from "./actions";
import styles from "./PlanningBoard.module.css";
import pomodoroStyles from "./PomodoroTimer.module.css";
import Link from "next/link";
import BurnDownChart, {
  ChartData,
} from "@/app/[locale]/components/BurnDownChart";
import { addCalendarDays, formatDate } from "@/app/[locale]/components/chartUtils";
import PomodoroTimer from "./PomodoroTimer";
import { PomodoroProvider, usePomodoro } from "./PomodoroContext";
import { TaskStatus } from "@/domain/entities/Task";
import { SprintStatus } from "@/domain/entities/Sprint";
import { Capacity } from "@/domain/entities/Capacity";
import { BurnDownSnapshot } from "@/domain/entities/BurnDownSnapshot";
import { BacklogItem } from "@/domain/entities/BacklogItem";
import { TodoTask } from "@/domain/entities/TodoTask";

type TaskWithStatus = {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedPulse: number;
  actualPulse: number;
};

export type SprintItemWithTasks = BacklogItem & {
  tasks: TaskWithStatus[];
};

type SprintData = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  goal: string | null;
  status: SprintStatus;
  retrospective?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

interface PlanningBoardProps {
  sprint: SprintData;
  initialCapacities: Capacity[];
  snapshots: BurnDownSnapshot[];
  sprintItems: SprintItemWithTasks[];
  availableItems: BacklogItem[];
  todoTasks: TodoTask[];
  unassignedTodoTasks: TodoTask[];
  velocity: number;
  pulseStats: {
    totalEstPulse: number;
    plannedActualPulse: number;
    totalActualPulse: number;
  };
  chartData: ChartData[];
}

export default function PlanningBoard({
  sprint,
  initialCapacities,
  snapshots,
  sprintItems,
  availableItems,
  todoTasks,
  unassignedTodoTasks,
  velocity,
  pulseStats,
  chartData,
}: PlanningBoardProps) {
  return (
    <PomodoroProvider>
      <PlanningBoardInner
        sprint={sprint}
        initialCapacities={initialCapacities}
        snapshots={snapshots}
        sprintItems={sprintItems}
        availableItems={availableItems}
        todoTasks={todoTasks}
        unassignedTodoTasks={unassignedTodoTasks}
        velocity={velocity}
        pulseStats={pulseStats}
        chartData={chartData}
      />
    </PomodoroProvider>
  );
}

function PlanningBoardInner({
  sprint,
  initialCapacities,
  snapshots,
  sprintItems,
  availableItems,
  todoTasks,
  unassignedTodoTasks,
  velocity,
  pulseStats,
  chartData,
}: PlanningBoardProps) {
  const { startPomodoro } = usePomodoro();
  const t = useTranslations("sprints");
  const locale = useLocale();
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>(
    {},
  );
  const [newTaskEst, setNewTaskEst] = useState<{ [key: string]: number }>({});
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoEst, setNewTodoEst] = useState(0);
  const [newTodoDeadline, setNewTodoDeadline] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(["todo", "doing", "done", "pooled"]),
  );

  const handleStartPomodoro = async (taskId: string, isTodoTask: boolean) => {
    const task = isTodoTask
      ? todoTasks.find((t) => t.id === taskId)
      : sprintItems.flatMap((item) => item.tasks).find((t) => t.id === taskId);

    if (!task) return;

    // 実績+1
    if (isTodoTask) {
      await updateTodoPulseAction(sprint.id, taskId, task.actualPulse + 1);
      if (task.status === "todo") {
        await updateTodoStatusAction(sprint.id, taskId, "doing");
      }
    } else {
      await updateTaskPulseAction(sprint.id, taskId, task.actualPulse + 1);
      if (task.status === "todo") {
        await updateTaskStatusAction(sprint.id, taskId, "doing");
      }
    }

    // Contextを開始
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
    startPomodoro(taskId, task.title, isTodoTask, 25);
  };

  const handleCompletePomodoro = async (
    taskId: string,
    isTodoTask: boolean,
  ) => {
    console.debug(`Pomodoro completed: taskId=${taskId}, isTodoTask=${isTodoTask}`);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const statusPriority: Record<string, number> = {
    todo: 1,
    doing: 2,
    pooled: 3,
    done: 4,
  };

  const totalCapacity = initialCapacities.reduce((sum, c) => sum + c.pulseCount, 0);
  const totalPoints = sprintItems.reduce(
    (sum, item) => sum + (item.storyPoints ?? 0),
    0,
  );

  // スプリント全体の合計実績Pulseと見積Pulse (PBIタスク + Todoタスク)
  const { totalEstPulse, plannedActualPulse, totalActualPulse } = pulseStats;

  // キャパシティマップ（日付文字列 → パルス数）
  const capacityMap: { [key: string]: number } = {};
  initialCapacities.forEach((c: Capacity) => {
    const dateStr = formatDate(c.date);
    capacityMap[dateStr] = (capacityMap[dateStr] || 0) + c.pulseCount;
  });

  // 残り見積Pulse（未完了タスクの見積もり合計）
  const remainingEstPulse = totalEstPulse - plannedActualPulse;

  // 明日以降のキャパシティ合計（本日を除く）
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(sprint.endDate);
  endDate.setHours(0, 0, 0, 0);
  let remainingCapacityFromTomorrow = 0;
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentDate = new Date(tomorrow);
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate);
    remainingCapacityFromTomorrow += capacityMap[dateStr] || 0;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 警告判定：残り見積が明日以降のキャパシティを超えているか
  const isOverCapacity = remainingEstPulse > remainingCapacityFromTomorrow;

  // 今日の進捗遅延をチェック（前日のスナップショットと比較）
  const todayStrCheck = formatDate(new Date());
  const todayEntry = chartData.find((d) => d.date === todayStrCheck);

  const yesterdayStr = formatDate(addCalendarDays(new Date(), -1));
  const yesterdayEntry = chartData.find((d) => d.date === yesterdayStr);

  let isTodayBehind = false;
  let completedToday = 0;
  let todayCapacity = 0;
  if (
    todayEntry &&
    yesterdayEntry &&
    todayEntry.actual !== null &&
    yesterdayEntry.actual !== null
  ) {
    completedToday = yesterdayEntry.actual - todayEntry.actual; // 今日完了した量
    todayCapacity = capacityMap[todayStrCheck] || 0; // 今日のキャパシティ
    isTodayBehind = completedToday < todayCapacity;
  }

  const formatDateForInput = (date: string | Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const handleAddTask = async (backlogItemId: string) => {
    const title = newTaskTitle[backlogItemId];
    const est = newTaskEst[backlogItemId] || 0;
    if (!title) return;
    await addTaskAction(sprint.id, backlogItemId, title, est);
    setNewTaskTitle((prev) => ({ ...prev, [backlogItemId]: "" }));
    setNewTaskEst((prev) => ({ ...prev, [backlogItemId]: 0 }));
  };

  const handleAddTodoTask = async () => {
    if (!newTodoTitle) return;
    const deadline = newTodoDeadline ? new Date(newTodoDeadline) : null;
    await addTodoTaskAction(sprint.id, newTodoTitle, newTodoEst, deadline);
    setNewTodoTitle("");
    setNewTodoEst(0);
    setNewTodoDeadline("");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
              <Link href="/sprints" className={styles.backLink}>
                ← {t('title')}
              </Link>
          <h1 className={styles.title}>{sprint.name}</h1>
          <span className={`${styles.status} ${styles[sprint.status]}`}>
            {sprint.status}
          </span>
        </div>
        <div className={styles.headerRight}>
          {sprint.status === "planning" && (
              <button
                onClick={() => updateSprintStatusAction(sprint.id, "active")}
                className={styles.startButton}
              >
                {t('startSprint')}
              </button>
          )}
          {sprint.status === "active" && (
            <button
              onClick={() => updateSprintStatusAction(sprint.id, "completed")}
              className={styles.completeButton}
            >
              {t('completeSprint')}
            </button>
          )}
        </div>
      </header>

      {sprint.goal && (
        <div className={styles.goalBox}>
          <strong>{t('sprintGoal')}</strong> {sprint.goal}
        </div>
      )}

        <div className={styles.dashboard}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>
              {t('statsLabel')}
            </span>
          <span className={styles.statValue}>
            {totalEstPulse} / {plannedActualPulse} / {totalActualPulse} Pulse
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('remainingEstimate')}</span>
          <span
            className={styles.statValue}
            style={
              isOverCapacity ? { color: "#e74c3c", fontWeight: "bold" } : {}
            }
          >
            {remainingEstPulse} Pulse
          </span>
          {isOverCapacity && (
            <span
              style={{
                color: "#e74c3c",
                fontSize: "0.8rem",
                marginTop: "0.25rem",
              }}
            >
                ⚠️ {t('overCapacity')}
            </span>
          )}
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t('capacityFromTomorrow')}</span>
          <span
            className={styles.statValue}
            style={
              isOverCapacity ? { color: "#e74c3c", fontWeight: "bold" } : {}
            }
          >
            {remainingCapacityFromTomorrow} Pulse
          </span>
        </div>
      </div>

      {/* 今日の遅延警告 */}
      {isTodayBehind && (
        <div
          style={{
            color: "#e74c3c",
            fontWeight: "bold",
            marginBottom: "1rem",
            padding: "0.75rem",
            backgroundColor: "#ffebee",
            borderRadius: "8px",
            border: "1px solid #ef9a9a",
          }}
        >
          ⚠️ {t('todayDelayWarning', { completed: completedToday, planned: todayCapacity })}
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <BurnDownChart chartData={chartData} />
      </div>

      <div className={styles.gridFull}>
        <section className={styles.itemsSection}>
          <h2 className={styles.sectionTitle}>{t('sprintBacklogByItems')}</h2>
          <div className={styles.filterContainer}>
            {(["todo", "doing", "pooled", "done"] as const).map((status) => (
              <label key={status} className={styles.filterLabel}>
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(status)}
                  onChange={() => toggleStatus(status)}
                />
                <span className={`${styles.statusDot} ${styles[status]}`}>
                  {status.toUpperCase()}
                </span>
              </label>
            ))}
          </div>
          <div className={styles.itemList}>
            {sprintItems.length === 0 ? (
              <p className={styles.empty}>{t('noItems')}</p>
            ) : (
              sprintItems.map((item) => (
                <div key={item.id} className={styles.itemGroup}>
                  <div className={styles.itemCard}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemPoints}>
                        {item.storyPoints} pts
                      </span>
                      <span className={styles.itemTitle}>{item.title}</span>
                    </div>
                  <button
                    onClick={() =>
                      removeItemFromSprintAction(sprint.id, item.id)
                    }
                    className={styles.removeBtn}
                  >
                    {t('removeFromSprint')}
                  </button>
                  </div>

                  {/* タスク一覧 */}
                  <div className={styles.taskList}>
                    {item.tasks
                      .filter((task: TaskWithStatus) =>
                        selectedStatuses.has(task.status),
                      )
                      .sort(
                        (a: TaskWithStatus, b: TaskWithStatus) =>
                          statusPriority[a.status] - statusPriority[b.status],
                      )
                      .map((task: TaskWithStatus) => (
                        <div
                          key={task.id}
                          className={`${styles.taskRow} ${styles[task.status]}`}
                        >
                          <div className={styles.taskStatusControl}>
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateTaskStatusAction(
                                  sprint.id,
                                  task.id,
                                  e.target.value as TaskWithStatus["status"],
                                )
                              }
                              className={styles.statusSelect}
                            >
                      <option value="todo">{t('statusTodo')}</option>
                      <option value="doing">{t('statusDoing')}</option>
                      <option value="pooled">{t('statusPooled')}</option>
                      <option value="done">{t('statusDone')}</option>
                            </select>
                          </div>
                          {(task.status === "todo" ||
                            task.status === "doing") && (
                            <button
                              onClick={() =>
                                handleStartPomodoro(task.id, false)
                              }
                              className={pomodoroStyles.pomodoroBtn}
                              title={t('pomodoroStartTitle')}
                            >
                              🍅
                            </button>
                          )}
                          <input
                            type="text"
                            defaultValue={task.title}
                            className={`${styles.taskTitleInput} ${task.estimatedPulse === 0 || (task.status === "done" && task.actualPulse === 0) ? styles.taskTitleWarning : ""}`}
                            onBlur={(e) => {
                              if (e.target.value !== task.title) {
                                updateTaskTitleAction(
                                  sprint.id,
                                  task.id,
                                  e.target.value,
                                );
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                          />

                          <div className={styles.taskPulseControls}>
                            <div className={styles.pulseGroup}>
                              <span className={styles.pulseLabel}>{t('estLabel')}</span>
                              <div className={styles.taskPulseControl}>
                                <button
                                  onClick={() =>
                                    updateTaskEstimatedPulseAction(
                                      sprint.id,
                                      task.id,
                                      task.estimatedPulse - 1,
                                    )
                                  }
                                  className={styles.pulseBtnSmall}
                                >
                                  -
                                </button>
                                <span className={styles.pulseValueSmall}>
                                  {task.estimatedPulse}
                                </span>
                                <button
                                  onClick={() =>
                                    updateTaskEstimatedPulseAction(
                                      sprint.id,
                                      task.id,
                                      task.estimatedPulse + 1,
                                    )
                                  }
                                  className={styles.pulseBtnSmall}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <div className={styles.pulseGroup}>
                             <span className={styles.pulseLabel}>{t('actLabel')}</span>
                              <div className={styles.taskPulseControl}>
                                <button
                                  onClick={() =>
                                    updateTaskPulseAction(
                                      sprint.id,
                                      task.id,
                                      task.actualPulse - 1,
                                    )
                                  }
                                  className={styles.pulseBtnSmall}
                                >
                                  -
                                </button>
                                <span className={styles.pulseValueSmall}>
                                  {task.actualPulse}
                                </span>
                                <button
                                  onClick={() =>
                                    updateTaskPulseAction(
                                      sprint.id,
                                      task.id,
                                      task.actualPulse + 1,
                                    )
                                  }
                                  className={styles.pulseBtnSmall}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                     <button
                       onClick={() => deleteTaskAction(sprint.id, task.id)}
                       className={styles.taskDeleteBtn}
                     >
                       {t('deleteButton')}
                     </button>
                        </div>
                      ))}

                    {item.tasks.filter((task: TaskWithStatus) =>
                      selectedStatuses.has(task.status),
                    ).length === 0 && (
                      <p className={styles.empty}>
                        {t('noTasksWithStatus')}
                      </p>
                    )}

                    {/* タスク追加入力 */}
                    <div className={styles.addTaskRow}>
                      <input
                        type="text"
                         placeholder={t('newTaskPlaceholder')}
                        className={styles.addTaskInput}
                        value={newTaskTitle[item.id] || ""}
                        onChange={(e) =>
                          setNewTaskTitle((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddTask(item.id)
                        }
                      />
                      <div className={styles.addTaskEst}>
                        <input
                          type="number"
                          placeholder="Est"
                          className={styles.estInput}
                          value={newTaskEst[item.id] || ""}
                          onChange={(e) =>
                            setNewTaskEst((prev) => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                         <span className={styles.estUnit}>{t('pulseUnit')}</span>
                      </div>
                     <button
                       onClick={() => handleAddTask(item.id)}
                       className={styles.addTaskBtn}
                     >
                       {t('addButton')}
                     </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
            {t('productBacklogAvailable')}
          </h2>
          <div className={styles.itemList}>
            {availableItems.length === 0 ? (
                <p className={styles.empty}>{t('noAvailableItems')}</p>
            ) : (
              availableItems.map((item) => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemPoints}>
                      {item.storyPoints} pts
                    </span>
                    <span className={styles.itemTitle}>{item.title}</span>
                  </div>
                  <button
                    onClick={() => addItemToSprintAction(sprint.id, item.id)}
                    className={styles.addBtn}
                  >
                    {t('addToSprint')}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* スプリント共有ToDoセクション */}
          <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
            {t('generalTasksSection')}
          </h2>
          <div className={styles.filterContainer}>
            {(["todo", "doing", "pooled", "done"] as const).map((status) => (
              <label key={status} className={styles.filterLabel}>
                <input
                  type="checkbox"
                  checked={selectedStatuses.has(status)}
                  onChange={() => toggleStatus(status)}
                />
                <span className={`${styles.statusDot} ${styles[status]}`}>
                  {status.toUpperCase()}
                </span>
              </label>
            ))}
          </div>
          <div className={styles.itemList}>
            <div className={styles.itemGroup}>
              <div className={styles.taskList} style={{ paddingLeft: "1rem" }}>
                {todoTasks
                  .filter((todo: TodoTask) => selectedStatuses.has(todo.status))
                  .sort(
                    (a: TodoTask, b: TodoTask) =>
                      statusPriority[a.status] - statusPriority[b.status],
                  )
                  .map((todo: TodoTask) => (
                    <div
                      key={todo.id}
                      className={`${styles.taskRow} ${styles[todo.status]}`}
                    >
                      <div className={styles.taskStatusControl}>
                        <select
                          value={todo.status}
                          onChange={(e) =>
                            updateTodoStatusAction(
                              sprint.id,
                              todo.id,
                              e.target.value as TodoTask["status"],
                            )
                          }
                          className={styles.statusSelect}
                        >
                      <option value="todo">{t('statusTodo')}</option>
                      <option value="doing">{t('statusDoing')}</option>
                      <option value="pooled">{t('statusPooled')}</option>
                      <option value="done">{t('statusDone')}</option>
                        </select>
                      </div>
                      {(todo.status === "todo" || todo.status === "doing") && (
                        <button
                          onClick={() => handleStartPomodoro(todo.id, true)}
                          className={pomodoroStyles.pomodoroBtn}
                          title={t('pomodoroStartTitle')}
                        >
                          🍅
                        </button>
                      )}
                      <input
                        type="text"
                        defaultValue={todo.title}
                        className={`${styles.taskTitleInput} ${todo.estimatedPulse === 0 || (todo.status === "done" && todo.actualPulse === 0) ? styles.taskTitleWarning : ""}`}
                        onBlur={(e) => {
                          if (e.target.value !== todo.title) {
                            updateTodoTitleAction(
                              sprint.id,
                              todo.id,
                              e.target.value,
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <div className={styles.taskDeadline}>
                        <input
                          type="date"
                          defaultValue={formatDateForInput(todo.deadline)}
                          className={styles.deadlineInput}
                          onChange={(e) => {
                            const date = e.target.value
                              ? new Date(e.target.value)
                              : null;
                            updateTodoDeadlineAction(sprint.id, todo.id, date);
                          }}
                        />
                      </div>
                      <div className={styles.taskPulseControls}>
                        <div className={styles.pulseGroup}>
                         <span className={styles.pulseLabel}>{t('estLabel')}</span>
                          <div className={styles.taskPulseControl}>
                            <button
                              onClick={() =>
                                updateTodoEstimatedPulseAction(
                                  sprint.id,
                                  todo.id,
                                  todo.estimatedPulse - 1,
                                )
                              }
                              className={styles.pulseBtnSmall}
                            >
                              -
                            </button>
                            <span className={styles.pulseValueSmall}>
                              {todo.estimatedPulse}
                            </span>
                            <button
                              onClick={() =>
                                updateTodoEstimatedPulseAction(
                                  sprint.id,
                                  todo.id,
                                  todo.estimatedPulse + 1,
                                )
                              }
                              className={styles.pulseBtnSmall}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className={styles.pulseGroup}>
                         <span className={styles.pulseLabel}>{t('actLabel')}</span>
                          <div className={styles.taskPulseControl}>
                            <button
                              onClick={() =>
                                updateTodoPulseAction(
                                  sprint.id,
                                  todo.id,
                                  todo.actualPulse - 1,
                                )
                              }
                              className={styles.pulseBtnSmall}
                            >
                              -
                            </button>
                            <span className={styles.pulseValueSmall}>
                              {todo.actualPulse}
                            </span>
                            <button
                              onClick={() =>
                                updateTodoPulseAction(
                                  sprint.id,
                                  todo.id,
                                  todo.actualPulse + 1,
                                )
                              }
                              className={styles.pulseBtnSmall}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                       <button
                         onClick={() =>
                           unassignTodoTaskFromSprintAction(sprint.id, todo.id)
                         }
                         className={styles.removeBtn}
                         title={t('returnToPool')}
                       >
                         {t('returnToPool')}
                       </button>
                     <button
                       onClick={() => deleteTodoTaskAction(sprint.id, todo.id)}
                       className={styles.taskDeleteBtn}
                       title={t('deleteButton')}
                     >
                       {t('deleteButton')}
                     </button>
                    </div>
                  ))}

                {todoTasks.filter((todo: TodoTask) =>
                  selectedStatuses.has(todo.status),
                ).length === 0 && (
                 <p className={styles.empty}>
                   {t('noTasksWithStatus')}
                 </p>
                )}

                {/* ToDo追加入力 */}
                <div className={styles.addTaskRow}>
                  <input
                    type="text"
                         placeholder={t('generalTaskPlaceholder')}
                    className={styles.addTaskInput}
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTodoTask()}
                  />
                  <input
                    type="date"
                    className={styles.addTaskDeadline}
                    value={newTodoDeadline}
                    onChange={(e) => setNewTodoDeadline(e.target.value)}
                  />
                  <div className={styles.addTaskEst}>
                    <input
                      type="number"
                      placeholder="Est"
                      className={styles.estInput}
                      value={newTodoEst || ""}
                      onChange={(e) =>
                        setNewTodoEst(parseInt(e.target.value) || 0)
                      }
                    />
                    <span className={styles.estUnit}>P</span>
                  </div>
                   <button
                     onClick={handleAddTodoTask}
                     className={styles.addTaskBtn}
                   >
                     {t('addButton')}
                   </button>
                </div>
              </div>
            </div>
          </div>

          {/* Todoタスクプール（未割当）セクション */}
          <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
            {t('todoPool')}
          </h2>
          <div className={styles.itemList}>
            {unassignedTodoTasks.length === 0 ? (
                <p className={styles.empty}>{t('noUnassignedTodos')}</p>
            ) : (
              unassignedTodoTasks.map((todo: TodoTask) => (
                <div key={todo.id} className={styles.itemCard}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemTitle}>{todo.title}</span>
                     {todo.deadline && (
                       <span className={styles.itemPoints}>
                         {t('deadlineLabel')}{" "}
                         {new Date(todo.deadline).toLocaleDateString(locale === 'ja' ? "ja-JP" : "en-US")}
                       </span>
                     )}
                    <span className={styles.itemPoints}>
                      {todo.estimatedPulse} P
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      assignTodoTaskToSprintAction(sprint.id, todo.id)
                    }
                    className={styles.addBtn}
                  >
                    {t('addToSprintFull')}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      <PomodoroTimer
        onComplete={handleCompletePomodoro}
      />
    </div>
  );
}
