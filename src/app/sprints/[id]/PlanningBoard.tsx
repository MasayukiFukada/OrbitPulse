"use client";

import { useState, useEffect } from "react";
import {
  updateCapacitiesAction,
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
import BurnDownChart from "@/app/components/BurnDownChart";
import PomodoroTimer from "./PomodoroTimer";
import { PomodoroProvider, usePomodoro } from "./PomodoroContext";
import PomodoroStatusDisplay from "./PomodoroStatusDisplay";
import type {
  Sprint,
  Capacity,
  BurnDownSnapshot,
  BacklogItem,
  TodoTask,
} from "@/infrastructure/db/schema";

type TaskWithStatus = {
  id: string;
  title: string;
  status: string;
  estimatedPulse: number;
  actualPulse: number;
};

type SprintItemWithTasks = BacklogItem & {
  tasks: TaskWithStatus[];
};

interface PlanningBoardProps {
  sprint: Sprint;
  initialCapacities: Capacity[];
  snapshots: BurnDownSnapshot[];
  sprintItems: SprintItemWithTasks[];
  availableItems: BacklogItem[];
  todoTasks: TodoTask[];
  unassignedTodoTasks: TodoTask[];
}

export default function PlanningBoard({
  sprint,
  initialCapacities,
  snapshots,
  sprintItems,
  availableItems,
  todoTasks,
  unassignedTodoTasks,
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
}: PlanningBoardProps) {
  const { startPomodoro } = usePomodoro();
  const [capacities, setCapacities] = useState(initialCapacities);
  const [isSaving, setIsSaving] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>(
    {},
  );
  const [newTaskEst, setNewTaskEst] = useState<{ [key: string]: number }>({});
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoEst, setNewTodoEst] = useState(0);
  const [newTodoDeadline, setNewTodoDeadline] = useState("");
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(
    new Set(["todo", "doing", "done", "pooled"]),
  );

  const handleStartPomodoro = async (taskId: string, isTodoTask: boolean) => {
    const task = isTodoTask
      ? todoTasks.find((t) => t.id === taskId)
      : sprintItems
          .flatMap((item) => item.tasks)
          .find((t) => t.id === taskId);

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
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    startPomodoro(taskId, task.title, isTodoTask, 25);
  };

  const handleCompletePomodoro = async (taskId: string, isTodoTask: boolean) => {
    // 完了時の追加アクションがあればここに記述
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

  useEffect(() => {
    fetch("https://holidays-jp.github.io/api/v1/date.json")
      .then((res) => res.json())
      .then((data: { [key: string]: string }) => {
        setHolidays(new Set(Object.keys(data)));
      })
      .catch(() => {});
  }, []);

  const totalCapacity = capacities.reduce((sum, c) => sum + c.pulseCount, 0);
  const totalPoints = sprintItems.reduce(
    (sum, item) => sum + item.storyPoints,
    0,
  );

  // スプリント全体の合計実績Pulseと見積Pulse (PBIタスク + Todoタスク)
  // 総予定: pooled除く全タスクの見積もり合計
  const pbiTotalEst = sprintItems.reduce(
    (sum, item) =>
      sum +
      item.tasks.reduce(
        (tSum: number, t: TaskWithStatus) =>
          t.status !== "pooled" ? tSum + t.estimatedPulse : tSum,
        0,
      ),
    0,
  );
  const todoTotalEst = todoTasks.reduce(
    (sum, t) => (t.status !== "pooled" ? sum + t.estimatedPulse : sum),
    0,
  );
  const totalEstPulse = pbiTotalEst + todoTotalEst; // 総予定Pulse

  // 予定実績: doneタスクの見積もり合計
  const pbiPlannedActual = sprintItems.reduce(
    (sum, item) =>
      sum +
      item.tasks.reduce(
        (tSum: number, t: TaskWithStatus) =>
          t.status === "done" ? tSum + t.estimatedPulse : tSum,
        0,
      ),
    0,
  );
  const todoPlannedActual = todoTasks.reduce(
    (sum, t) => (t.status === "done" ? sum + t.estimatedPulse : sum),
    0,
  );
  const plannedActualPulse = pbiPlannedActual + todoPlannedActual;

  // 実際実績: pooled除く全タスクの実績合計
  const pbiActual = sprintItems.reduce(
    (sum, item) =>
      sum +
      item.tasks.reduce(
        (tSum: number, t: TaskWithStatus) =>
          t.status !== "pooled" ? tSum + t.actualPulse : tSum,
        0,
      ),
    0,
  );
  const todoActual = todoTasks.reduce(
    (sum, t) => (t.status !== "pooled" ? sum + t.actualPulse : sum),
    0,
  );
  const totalActualPulse = pbiActual + todoActual;

  // 日付フォーマット関数 (MM/DD)
  const formatDate = (date: Date) => {
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${m}/${d}`;
  };

  // キャパシティマップ（日付文字列 → パルス数）
  const capacityMap: { [key: string]: number } = {};
  capacities.forEach((c: Capacity) => {
    const dateStr = formatDate(new Date(c.date));
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

  // バーンダウンチャート用データ生成
  const generateChartData = () => {
    const chartStartDate = new Date(sprint.startDate);
    const chartEndDate = new Date(sprint.endDate);
    type ChartDataItem = {
      date: string;
      ideal: number;
      actual: number | null;
      capacity: number;
    };
    const chartData: ChartDataItem[] = [];
  
    // 総予定Pulse: スナップショットの最初の値に予定実績を足すか、現在の総予定Pulse
    let totalPulse;
    if (snapshots && snapshots.length > 0) {
      const sortedSnapshots = [...snapshots].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      // スナップショットの最初の残りPulse + その時点の予定実績（完了分）
      totalPulse = sortedSnapshots[0].remainingPulse + plannedActualPulse;
    } else {
      totalPulse = totalEstPulse;
    }

    // 総キャパシティを計算
    let totalCapacity = 0;
    Object.values(capacityMap).forEach((v) => (totalCapacity += v));

    // 日ごとの理想残りPulseと実績残りPulse
    let usedCapacity = 0;
    const currentDate = new Date(chartStartDate);
    const snapshotMap: { [key: string]: number } = {};
    (snapshots || []).forEach((s: BurnDownSnapshot) => {
      const dateStr = formatDate(new Date(s.date));
      snapshotMap[dateStr] = s.remainingPulse;
    });

    // 現在の残り作業量を取得（最新のスナップショットまたは総予定）
    const todayInChart = new Date();
    todayInChart.setHours(0, 0, 0, 0);
    const todayStr = formatDate(todayInChart);  
    // 現在日から理想線を開始するための準備
    let idealStarted = false;
    let remainingWork = totalPulse; // 現在の残り作業量
  
  // 残り工作日数の計算は不要（実際のキャパシティ通りに消化するため）

    while (currentDate <= chartEndDate) {
      const dateStr = formatDate(currentDate);
      const dayCapacity = capacityMap[dateStr] || 0;
      const remainingCapacity = Math.max(0, totalCapacity - usedCapacity);

    // 理想線：今日から開始し、明日以降のキャパシティ通りに消化した場合を計算
    let idealValue = null;
    if (!idealStarted && dateStr >= todayStr) {
      // 今日以降：理想線を開始
      idealStarted = true;
      // 現在の残り作業量を設定（最新のスナップショットがあればそれを使う）
      const latestSnapshot = [...(snapshots || [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      remainingWork = latestSnapshot ? latestSnapshot.remainingPulse : totalPulse;
      idealValue = remainingWork; // 今日の時点での残り作業量を表示
    }
    
    if (idealStarted && dateStr > todayStr) {
      // 明日以降：実際のキャパシティ通りに減算（整数）
      const dailyDecrease = Math.min(dayCapacity, remainingWork);
      remainingWork = Math.max(0, remainingWork - dailyDecrease);
      idealValue = remainingWork;
    }

      const actual =
        snapshotMap[dateStr] !== undefined ? snapshotMap[dateStr] : null;

      chartData.push({
        date: dateStr,
        ideal: idealValue,
        actual: actual,
        capacity: remainingCapacity,
      });

      usedCapacity += dayCapacity;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { chartData, totalPulse };
  };

const { chartData, totalPulse } = generateChartData();

const todayForStr = new Date();
const todayStr = `${todayForStr.getFullYear()}-${String(todayForStr.getMonth() + 1).padStart(2, "0")}-${String(todayForStr.getDate()).padStart(2, "0")}`;

const formatDateForInput = (date: string | Date | null) => {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
};

const handlePulseChange = (id: string, delta: number) => {
  setCapacities((prev) =>
    prev.map((c) =>
      c.id === id ? { ...c, pulseCount: Math.max(0, c.pulseCount + delta) } : c,
    ),
  );
};

const saveCapacities = async () => {
  setIsSaving(true);
  await updateCapacitiesAction(sprint.id, capacities);
  setIsSaving(false);
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
          ← Sprints
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
            スプリント開始！
          </button>
        )}
        {sprint.status === "active" && (
          <button
            onClick={() => updateSprintStatusAction(sprint.id, "completed")}
            className={styles.completeButton}
          >
            スプリント完了
          </button>
        )}
      </div>
    </header>

    {sprint.goal && (
      <div className={styles.goalBox}>
        <strong>Sprint Goal:</strong> {sprint.goal}
      </div>
    )}

    <div className={styles.dashboard}>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>総予定 / 完了分当初見積 / 実際実績</span>
        <span className={styles.statValue}>
          {totalEstPulse} / {plannedActualPulse} / {totalActualPulse} Pulse
        </span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>残り見積</span>
        <span className={styles.statValue} style={isOverCapacity ? { color: '#e74c3c', fontWeight: 'bold' } : {}}>
          {remainingEstPulse} Pulse
        </span>
        {isOverCapacity && <span style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>⚠️ キャパシティ超過</span>}
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>明日以降のキャパシティ</span>
        <span className={styles.statValue} style={isOverCapacity ? { color: '#e74c3c', fontWeight: 'bold' } : {}}>
          {remainingCapacityFromTomorrow} Pulse
        </span>
      </div>
    </div>

    <div style={{ marginBottom: "2rem" }}>
      <BurnDownChart chartData={chartData} totalPulse={totalPulse} />
    </div>

    <div className={styles.grid}>
      <section className={styles.capacitySection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Capacities</h2>
          <button
            onClick={saveCapacities}
            disabled={isSaving}
            className={styles.saveButton}
          >
            {isSaving ? "保存中..." : "キャパ保存"}
          </button>
        </div>
        <div className={styles.capacityList}>
          {capacities.map((c) => {
            const cDate = new Date(c.date);
            const cYear = cDate.getFullYear();
            const cMonth = String(cDate.getMonth() + 1).padStart(2, "0");
            const cDay = String(cDate.getDate()).padStart(2, "0");
            const cDateStr = `${cYear}-${cMonth}-${cDay}`;
            const isToday = cDateStr === todayStr;
            return (
              <div
                key={c.id}
                className={`${styles.capacityRow} ${isToday ? styles.todayRow : ""}`}
              >
                <div className={styles.dateInfo}>
                  {(() => {
                    const d = new Date(c.date);
                    const dayOfWeek = d.getDay();
                    const isSat = dayOfWeek === 6;
                    const isSun = dayOfWeek === 0;
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateStr = `${year}-${month}-${day}`;
                    const isHoliday = holidays.has(dateStr);
                    const dateClass = `${styles.date} ${isSat ? styles.saturday : ""} ${isSun ? styles.sunday : ""} ${isHoliday ? styles.holiday : ""}`;
                    const dayClass = `${styles.day} ${isSat ? styles.saturday : ""} ${isSun ? styles.sunday : ""} ${isHoliday ? styles.holiday : ""}`;
                    return (
                      <>
                        <span className={dateClass}>
                          {d.toLocaleDateString("ja-JP", {
                            weekday: "short",
                          })}
                        </span>
                        <span className={dayClass}>{d.getDate()}</span>
                      </>
                    );
                  })()}
                </div>
                <div className={styles.pulseControl}>
                  <button
                    onClick={() => handlePulseChange(c.id, -1)}
                    className={styles.pulseBtn}
                  >
                    -
                  </button>
                  <span className={styles.pulseValue}>{c.pulseCount}</span>
                  <button
                    onClick={() => handlePulseChange(c.id, 1)}
                    className={styles.pulseBtn}
                  >
                    +
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="メモ（体調など）"
                  className={styles.noteInput}
                  value={c.note || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCapacities((prev) =>
                      prev.map((item) =>
                        item.id === c.id ? { ...item, note: val } : item,
                      ),
                    );
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.itemsSection}>
        <h2 className={styles.sectionTitle}>Sprint Backlog (by Items)</h2>
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
            <p className={styles.empty}>アイテムがありません</p>
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
                    外す
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
                            <option value="todo">TODO</option>
                            <option value="doing">DOING</option>
                            <option value="pooled">POOLED</option>
                            <option value="done">DONE</option>
                          </select>
                        </div>
                        {(task.status === "todo" || task.status === "doing") && (
                          <button
                            onClick={() =>
                              handleStartPomodoro(task.id, false)
                            }
                            className={pomodoroStyles.pomodoroBtn}
                            title="ポモドーロタイマーを開始"
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
                            <span className={styles.pulseLabel}>Est:</span>
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
                            <span className={styles.pulseLabel}>Act:</span>
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
                          ×
                        </button>
                      </div>
                    ))}

                  {item.tasks.filter((task: TaskWithStatus) =>
                    selectedStatuses.has(task.status),
                  ).length === 0 && (
                    <p className={styles.empty}>
                      選択されたステータスのタスクはありません
                    </p>
                  )}

                  {/* タスク追加入力 */}
                  <div className={styles.addTaskRow}>
                    <input
                      type="text"
                      placeholder="新しいタスクを追加..."
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
                      <span className={styles.estUnit}>P</span>
                    </div>
                    <button
                      onClick={() => handleAddTask(item.id)}
                      className={styles.addTaskBtn}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
          Product Backlog (Available Items)
        </h2>
        <div className={styles.itemList}>
          {availableItems.length === 0 ? (
            <p className={styles.empty}>追加可能なアイテムはありません</p>
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
                  追加
                </button>
              </div>
            ))
          )}
        </div>

        {/* スプリント共有ToDoセクション */}
        <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
          Sprint General Tasks (ToDo)
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
                        <option value="todo">TODO</option>
                        <option value="doing">DOING</option>
                        <option value="pooled">POOLED</option>
                        <option value="done">DONE</option>
                        </select>
                        </div>
                        {(todo.status === "todo" || todo.status === "doing") && (
                        <button
                        onClick={() =>
                          handleStartPomodoro(todo.id, true)
                        }
                        className={pomodoroStyles.pomodoroBtn}
                        title="ポモドーロタイマーを開始"
                        >
                        🍅
                        </button>
                        )}
                        <input
                        type="text"                      defaultValue={todo.title}
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
                        <span className={styles.pulseLabel}>Est:</span>
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
                        <span className={styles.pulseLabel}>Act:</span>
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
                      title="プールに戻す"
                    >
                      外す
                    </button>
                    <button
                      onClick={() => deleteTodoTaskAction(sprint.id, todo.id)}
                      className={styles.taskDeleteBtn}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}

              {todoTasks.filter((todo: TodoTask) =>
                selectedStatuses.has(todo.status),
              ).length === 0 && (
                <p className={styles.empty}>
                  選択されたステータスのタスクはありません
                </p>
              )}

              {/* ToDo追加入力 */}
              <div className={styles.addTaskRow}>
                <input
                  type="text"
                  placeholder="一般的なタスクを追加..."
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
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Todoタスクプール（未割当）セクション */}
        <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>
          Todo Task Pool (Unassigned)
        </h2>
        <div className={styles.itemList}>
          {unassignedTodoTasks.length === 0 ? (
            <p className={styles.empty}>未割当のTodoタスクはありません</p>
          ) : (
            unassignedTodoTasks.map((todo: TodoTask) => (
              <div key={todo.id} className={styles.itemCard}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{todo.title}</span>
                  {todo.deadline && (
                    <span className={styles.itemPoints}>
                      期限:{" "}
                      {new Date(todo.deadline).toLocaleDateString("ja-JP")}
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
                  スプリントに追加
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
    <PomodoroTimer
      onStart={handleStartPomodoro}
      onComplete={handleCompletePomodoro}
    />
  </div>
);
}
