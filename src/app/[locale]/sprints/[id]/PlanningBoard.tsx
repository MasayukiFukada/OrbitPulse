"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  addItemToSprintAction,
  removeItemFromSprintAction,
  updateSprintStatusAction,
  updateTaskPulseAction,
  updateTaskRemainingPulseAction,
  updateTaskStatusAction,
  updateTodoPulseAction,
  updateTodoStatusAction,
  updateTaskEstimatedPulseAction,
  updateTodoEstimatedPulseAction,
  deleteTaskAction,
  deleteTodoTaskAction,
} from "./actions";
import styles from "./PlanningBoard.module.css";
import pomodoroStyles from "./PomodoroTimer.module.css";
import BurnDownChart, {
  ChartData,
} from "@/app/[locale]/components/BurnDownChart";
import { addCalendarDays, formatDate, toDateKey } from "@/app/[locale]/components/chartUtils";
import PomodoroTimer from "./PomodoroTimer";
import { usePomodoro } from "./PomodoroContext";
import { TaskStatus } from "@/domain/entities/Task";

interface Capacity {
  date: string;
  capacity: number;
  remaining: number;
  note: string | null;
}

interface BurnDownSnapshot {
  date: string;
  remainingEstimate: number;
}

interface TaskWithStatus {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedPulse: number;
  actualPulse: number;
  remainingPulse: number;
}

interface SprintItemWithTasks {
  id: string;
  title: string;
  subject: string;
  storyPoints: number;
  tasks: TaskWithStatus[];
}

interface BacklogItem {
  id: string;
  title: string;
  subject: string;
  storyPoints: number;
}

interface TodoTask {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedPulse: number;
  actualPulse: number;
  remainingPulse: number;
  deadline: string | null;
}

interface SprintData {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  goal: string | null;
  days: Capacity[];
}

interface PlanningBoardProps {
  sprint: SprintData;
  initialCapacities: Capacity[];
  snapshots: BurnDownSnapshot[];
  sprintItems: SprintItemWithTasks[];
  availableItems: BacklogItem[];
  todoTasks: TodoTask[];
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
  velocity,
  pulseStats,
  chartData,
}: PlanningBoardProps) {
  return (
    <PlanningBoardInner
      sprint={sprint}
      initialCapacities={initialCapacities}
      snapshots={snapshots}
      sprintItems={sprintItems}
      availableItems={availableItems}
      todoTasks={todoTasks}
      velocity={velocity}
      pulseStats={pulseStats}
      chartData={chartData}
    />
  );
}

function PlanningBoardInner({
  sprint,
  initialCapacities,
  snapshots,
  sprintItems,
  availableItems,
  todoTasks,
  velocity,
  pulseStats,
  chartData,
}: PlanningBoardProps) {
  const { startPomodoro } = usePomodoro();
  const t = useTranslations("sprints");
  const locale = useLocale();

  const activeSprint = sprint.status === "active";
  const [activeOverColumn, setActiveOverColumn] = useState<string | null>(null);

  // インライン数値編集用ステート
  const [editingPulse, setEditingPulse] = useState<{
    taskId: string;
    type: "est" | "act" | "rem";
    value: string;
  } | null>(null);

  const capacityMap: { [key: string]: number } = {};
  initialCapacities.forEach((c) => {
    capacityMap[formatDate(c.date)] = c.capacity;
  });

  const { totalEstPulse, plannedActualPulse, totalActualPulse } = pulseStats;
  const remainingEstPulse = totalEstPulse - plannedActualPulse;

  const todayKey = toDateKey(new Date());
  const endDateKey = toDateKey(sprint.endDate);
  let remainingCapacityFromTomorrow = 0;

  let currentLoopDate = addCalendarDays(new Date(), 1);
  let currentLoopKey = toDateKey(currentLoopDate);

  while (currentLoopKey <= endDateKey) {
    const dateStr = formatDate(currentLoopDate);
    remainingCapacityFromTomorrow += capacityMap[dateStr] || 0;
    currentLoopDate = addCalendarDays(currentLoopDate, 1);
    currentLoopKey = toDateKey(currentLoopDate);
  }

  const isOverCapacity = remainingEstPulse > remainingCapacityFromTomorrow;

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
    completedToday = yesterdayEntry.actual - todayEntry.actual;
    todayCapacity = capacityMap[todayStrCheck] || 0;
    isTodayBehind = completedToday < todayCapacity;
  }

  const handleStartPomodoro = (taskId: string, isTodo: boolean) => {
    let title = "";
    let est = 1;
    if (isTodo) {
      const todo = todoTasks.find((t) => t.id === taskId);
      if (todo) {
        title = todo.title;
        est = todo.estimatedPulse;
      }
    } else {
      for (const item of sprintItems) {
        const task = item.tasks.find((t) => t.id === taskId);
        if (task) {
          title = task.title;
          est = task.estimatedPulse;
          break;
        }
      }
    }
    startPomodoro(taskId, title, isTodo, est * 25);
  };



  // ドラッグ＆ドロップイベントハンドラー
  const handleDragStart = (e: React.DragEvent, taskId: string, isTodo: boolean) => {
    e.dataTransfer.setData("taskId", taskId);
    e.dataTransfer.setData("isTodo", isTodo.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setActiveOverColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setActiveOverColumn(null);
    const taskId = e.dataTransfer.getData("taskId");
    const isTodoStr = e.dataTransfer.getData("isTodo");

    if (!taskId) return;

    const isTodo = isTodoStr === "true";

    if (isTodo) {
      await updateTodoStatusAction(sprint.id, taskId, targetStatus);
    } else {
      await updateTaskStatusAction(sprint.id, taskId, targetStatus);
    }
  };

  // Pulse数値調整（1ずつ増減）
  const handlePulseStep = async (task: FlatTask, type: "est" | "act" | "rem", step: number) => {
    const isTodo = task.isTodo;
    if (type === "est") {
      const nextVal = Math.max(0, task.estimatedPulse + step);
      if (isTodo) {
        await updateTodoEstimatedPulseAction(sprint.id, task.id, nextVal);
      } else {
        await updateTaskEstimatedPulseAction(sprint.id, task.id, nextVal);
      }
    } else if (type === "act") {
      const nextVal = Math.max(0, task.actualPulse + step);
      if (isTodo) {
        await updateTodoPulseAction(sprint.id, task.id, nextVal);
      } else {
        await updateTaskPulseAction(sprint.id, task.id, nextVal);
      }
    } else if (type === "rem") {
      const nextVal = Math.max(0, task.remainingPulse + step);
      await updateTaskRemainingPulseAction(sprint.id, task.id, nextVal);
    }
  };

  // インライン数値保存処理
  const handleSavePulse = async () => {
    if (!editingPulse) return;
    const { taskId, type, value } = editingPulse;
    setEditingPulse(null); // 入力モードを閉じる

    const numVal = parseInt(value, 10);
    if (isNaN(numVal) || numVal < 0) return;

    const isTodo = todoTasks.some(t => t.id === taskId);

    if (type === "est") {
      if (isTodo) {
        await updateTodoEstimatedPulseAction(sprint.id, taskId, numVal);
      } else {
        await updateTaskEstimatedPulseAction(sprint.id, taskId, numVal);
      }
    } else if (type === "act") {
      if (isTodo) {
        await updateTodoPulseAction(sprint.id, taskId, numVal);
      } else {
        await updateTaskPulseAction(sprint.id, taskId, numVal);
      }
    } else if (type === "rem") {
      await updateTaskRemainingPulseAction(sprint.id, taskId, numVal);
    }
  };

  // タスクのフラット化とマージ
  interface FlatTask {
    id: string;
    title: string;
    status: TaskStatus;
    estimatedPulse: number;
    actualPulse: number;
    remainingPulse: number;
    isTodo: boolean;
    backlogItemTitle: string | null;
  }

  const allTasks: FlatTask[] = [];

  sprintItems.forEach((item) => {
    item.tasks.forEach((task) => {
      allTasks.push({
        id: task.id,
        title: task.title,
        status: task.status,
        estimatedPulse: task.estimatedPulse,
        actualPulse: task.actualPulse,
        remainingPulse: task.remainingPulse,
        isTodo: false,
        backlogItemTitle: item.title,
      });
    });
  });

  todoTasks.forEach((todo) => {
    allTasks.push({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      estimatedPulse: todo.estimatedPulse,
      actualPulse: todo.actualPulse,
      remainingPulse: todo.remainingPulse,
      isTodo: true,
      backlogItemTitle: null,
    });
  });

  const pooledTasks = allTasks.filter(t => t.status === "pooled");
  const readyTasks = allTasks.filter(t => t.status === "todo");
  const activeTasks = allTasks.filter(t => t.status === "doing");
  const completedTasks = allTasks.filter(t => t.status === "done");

  const pooledPulse = pooledTasks.reduce((sum, t) => sum + t.remainingPulse, 0);
  const readyPulse = readyTasks.reduce((sum, t) => sum + t.remainingPulse, 0);
  const activePulse = activeTasks.reduce((sum, t) => sum + t.remainingPulse, 0);
  const completedPulse = completedTasks.reduce((sum, t) => sum + t.remainingPulse, 0);

  // 数値メーターの共通レンダリング関数 (ホバーで増減ボタン、クリックで直接入力)
  const renderPulseIndicator = (
    task: FlatTask,
    type: "est" | "act" | "rem",
    currentValue: number,
    label: string
  ) => {
    const isEditing = editingPulse?.taskId === task.id && editingPulse?.type === type;

    if (isEditing) {
      return (
        <div className={styles.pulseIndicator} onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            value={editingPulse.value}
            onChange={(e) => setEditingPulse({ ...editingPulse, value: e.target.value })}
            onBlur={handleSavePulse}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSavePulse();
              } else if (e.key === "Escape") {
                setEditingPulse(null);
              }
            }}
            className={styles.pulseInputInline}
            autoFocus
            min="0"
          />
          <span className={styles.pulseLabelMicro}>{label}</span>
        </div>
      );
    }

    return (
      <div 
        className={styles.pulseIndicator}
        onClick={() => setEditingPulse({ taskId: task.id, type, value: currentValue.toString() })}
      >
        <span className={styles.pulseValueLarge}>{currentValue}</span>
        <span className={styles.pulseLabelMicro}>{label}</span>
        <div className={styles.hoverControls}>
          <button
            onClick={(e) => {
              e.stopPropagation(); // 直接入力モードへの切り替えを防ぐ
              handlePulseStep(task, type, -1);
            }}
            className={styles.pulseBtnMicro}
          >
            -
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePulseStep(task, type, 1);
            }}
            className={styles.pulseBtnMicro}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  const renderKanbanCard = (task: FlatTask) => {
    const isIgniteTask = task.id.startsWith("ignite-active-");

    return (
      <div 
        key={task.id} 
        className={`${styles.kanbanCard} ${styles[task.status]} ${isIgniteTask ? styles.igniteCard : ""}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id, task.isTodo)}
      >
        <div className={styles.cardHeader}>
          <span 
            className={`${styles.cardBadge} ${isIgniteTask ? styles.igniteBadge : (task.isTodo ? styles.todoBadge : styles.storyBadge)}`}
            title={isIgniteTask ? "イグナイトガチャ儀式" : (task.backlogItemTitle || t("generalTasksSection"))}
          >
            {isIgniteTask ? "🔥 IGNITE" : (task.isTodo ? t("generalTasksSection") : task.backlogItemTitle)}
          </span>
          <button
            onClick={async (e) => {
              e.stopPropagation(); // 入力モードへの切り替えを防ぐ
              if (confirm("本当にこのタスクを削除しますか？")) {
                if (task.isTodo) {
                  await deleteTodoTaskAction(sprint.id, task.id);
                } else {
                  await deleteTaskAction(sprint.id, task.id);
                }
              }
            }}
            className={styles.cardDeleteBtn}
            title="削除"
          >
            ×
          </button>
        </div>

        <div className={styles.cardTitleArea}>
          {task.status === "doing" && (
            isIgniteTask ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await updateTodoStatusAction(sprint.id, task.id, "done");
                }}
                className={styles.igniteCompleteBtn}
                title="儀式を完了！"
              >
                ✅
              </button>
            ) : (
              <button
                onClick={() => handleStartPomodoro(task.id, task.isTodo)}
                className={pomodoroStyles.pomodoroBtn}
                title={t("pomodoroStartTitle")}
              >
                🍅
              </button>
            )
          )}
          <span className={styles.cardTitle}>{task.title}</span>
        </div>

        {/* 3連メーター (インライン編集 ＋ ホバー増減) - イグナイトは0固定のため非表示 */}
        {!isIgniteTask && (
          <div className={styles.cardPulseControls}>
            {renderPulseIndicator(task, "est", task.estimatedPulse, t("estLabel"))}
            {renderPulseIndicator(task, "act", task.actualPulse, t("actLabel"))}
            {renderPulseIndicator(task, "rem", task.remainingPulse, "Rem")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href={`/${locale}/sprints`} className={styles.backLink}>
            ← {t("title")}
          </Link>
          <h1 className={styles.title}>{sprint.name}</h1>
          <span className={`${styles.status} ${styles[sprint.status]}`}>
            {sprint.status}
          </span>
        </div>
        <div className={styles.headerRight}>
          {sprint.status === "active" ? (
            <button
              onClick={() => updateSprintStatusAction(sprint.id, "completed")}
              className={`${styles.actionBtn} ${styles.completeBtn}`}
            >
              {t("completeSprint")}
            </button>
          ) : sprint.status === "planning" ? (
            <button
              onClick={() => updateSprintStatusAction(sprint.id, "active")}
              className={`${styles.actionBtn} ${styles.startBtn}`}
            >
              {t("startSprint")}
            </button>
          ) : null}
        </div>
      </header>

      {sprint.goal && (
        <div className={styles.goalSection}>
          <span className={styles.goalLabel}>{t("sprintGoal")}</span>
          <p className={styles.goalContent}>{sprint.goal}</p>
        </div>
      )}

      <div className={styles.dashboardGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("statsLabel")}</span>
          <span className={styles.statValue}>
            {totalEstPulse} / {plannedActualPulse} / {totalActualPulse} Pulse
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("remainingEstimate")}</span>
          <span className={styles.statValue}>
            {remainingEstPulse} Pulse
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>{t("capacityFromTomorrow")}</span>
          <span
            className={`${styles.statValue} ${isOverCapacity ? styles.warning : ""}`}
          >
            {remainingCapacityFromTomorrow} Pulse
          </span>
          {isOverCapacity && (
            <span className={styles.alertText}>{t("overCapacity")}</span>
          )}
        </div>
      </div>

      {activeSprint && isTodayBehind && (
        <div className={styles.warningAlert}>
          ⚠️ {t("todayDelayWarning", { completed: completedToday, planned: todayCapacity })}
        </div>
      )}

      <div className={styles.boardLayout}>
        {/* 左側: チャートとストーリー管理 */}
        <section className={styles.leftSection}>
          <div className={styles.chartWrapper}>
            <BurnDownChart chartData={chartData} />
          </div>

          <div className={styles.planningArea}>
            <h2 className={styles.sectionTitle}>
              {t("sprintBacklogByItems")}
            </h2>
            <div className={styles.sprintItemList}>
              {sprintItems.length === 0 ? (
                <p className={styles.empty}>{t("noItems")}</p>
              ) : (
                sprintItems.map((item) => (
                  <div key={item.id} className={styles.itemCard}>
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
                      {t("removeFromSprint")}
                    </button>
                  </div>
                ))
              )}
            </div>

            <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
              {t("productBacklogAvailable")}
            </h2>
            <div className={styles.availableItemList}>
              {availableItems.length === 0 ? (
                <p className={styles.empty}>{t("noAvailableItems")}</p>
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
                      {t("addToSprint")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 右側: タスクカンバンボード (3列レイアウト) */}
        <section className={styles.kanbanSection}>
          <div className={styles.kanbanBoard}>
            
            {/* Ready & Pooled 列 (縦積み・物理ギャップあり) */}
            <div className={styles.kanbanDoubleColumn}>
              
              {/* Ready (ToDo) カラム */}
              <div 
                className={`${styles.kanbanColumnHalf} ${activeOverColumn === "ready" ? styles.dragOver : ""}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, "ready")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "todo")}
              >
                <div className={`${styles.columnHeader} ${styles.readyHeader}`}>
                  <h3>Ready</h3>
                  <span className={styles.columnCount}>{readyPulse} Pulse</span>
                </div>
                <div className={styles.kanbanCards}>
                  {readyTasks.length === 0 ? (
                    <p className={styles.emptyColumn}>{t("noTasksWithStatus")}</p>
                  ) : (
                    readyTasks.map(task => renderKanbanCard(task))
                  )}
                </div>
              </div>

              {/* Pooled カラム */}
              <div 
                className={`${styles.kanbanColumnHalf} ${activeOverColumn === "pooled" ? styles.dragOver : ""}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, "pooled")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "pooled")}
              >
                <div className={`${styles.columnHeader} ${styles.pooledHeader}`}>
                  <h3>Pooled</h3>
                  <span className={styles.columnCount}>{pooledPulse} Pulse</span>
                </div>
                <div className={styles.kanbanCards}>
                  {pooledTasks.length === 0 ? (
                    <p className={styles.emptyColumn}>{t("noTasksWithStatus")}</p>
                  ) : (
                    pooledTasks.map(task => renderKanbanCard(task))
                  )}
                </div>
              </div>

            </div>

            {/* Active カラム */}
            <div 
              className={`${styles.kanbanColumn} ${activeOverColumn === "active" ? styles.dragOver : ""}`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, "active")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "doing")}
            >
              <div className={`${styles.columnHeader} ${styles.activeHeader}`}>
                <h3>Active</h3>
                <span className={styles.columnCount}>{activePulse} Pulse</span>
              </div>
              <div className={styles.kanbanCards}>
                {activeTasks.length === 0 ? (
                  <p className={styles.emptyColumn}>{t("noTasksWithStatus")}</p>
                ) : (
                  activeTasks.map(task => renderKanbanCard(task))
                )}
              </div>
            </div>

            {/* Completed カラム */}
            <div 
              className={`${styles.kanbanColumn} ${activeOverColumn === "completed" ? styles.dragOver : ""}`}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, "completed")}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, "done")}
            >
              <div className={`${styles.columnHeader} ${styles.completedHeader}`}>
                <h3>Completed</h3>
                <span className={styles.columnCount}>{completedPulse} Pulse</span>
              </div>
              <div className={styles.kanbanCards}>
                {completedTasks.length === 0 ? (
                  <p className={styles.emptyColumn}>{t("noTasksWithStatus")}</p>
                ) : (
                  completedTasks.map(task => renderKanbanCard(task))
                )}
              </div>
            </div>

          </div>
        </section>
      </div>
      <PomodoroTimer />
    </div>
  );
}
