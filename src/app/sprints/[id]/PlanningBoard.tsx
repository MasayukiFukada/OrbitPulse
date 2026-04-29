"use client";

import { useState } from "react";
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
  unassignTodoTaskFromSprintAction
} from "./actions";
import styles from "./PlanningBoard.module.css";
import Link from "next/link";
import BurnDownChart from "@/app/components/BurnDownChart";

interface PlanningBoardProps {
  sprint: any;
  initialCapacities: any[];
  snapshots: any[];
  sprintItems: any[];
  availableItems: any[];
  todoTasks: any[];
  unassignedTodoTasks: any[];
}

export default function PlanningBoard({ sprint, initialCapacities, snapshots, sprintItems, availableItems, todoTasks, unassignedTodoTasks }: PlanningBoardProps) {
  const [capacities, setCapacities] = useState(initialCapacities);
  const [isSaving, setIsSaving] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>({});
  const [newTaskEst, setNewTaskEst] = useState<{ [key: string]: number }>({});
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoEst, setNewTodoEst] = useState(0);
  const [newTodoDeadline, setNewTodoDeadline] = useState("");

  // バーンダウンチャート用データ生成
  const generateChartData = () => {
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const chartData: any[] = [];

    // 日付フォーマット関数 (MM/DD)
    const formatDate = (date: Date) => {
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${m}/${d}`;
    };

    // 理想線のためのキャパシティ累積計算
    const capacityMap: { [key: string]: number } = {};
    capacities.forEach((c: any) => {
      const dateStr = formatDate(new Date(c.date));
      capacityMap[dateStr] = (capacityMap[dateStr] || 0) + c.pulseCount;
    });

    // 総予定Pulse
    const totalPulse = capacities.reduce((sum: number, c: any) => sum + c.pulseCount, 0);

    // 日ごとの理想残りPulseと実績残りPulse
    let idealRemaining = totalPulse;
    const currentDate = new Date(startDate);
    const snapshotMap: { [key: string]: number } = {};
    (snapshots || []).forEach((s: any) => {
      const dateStr = formatDate(new Date(s.date));
      snapshotMap[dateStr] = s.remainingPulse;
    });

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      const dayCapacity = capacityMap[dateStr] || 0;
      idealRemaining = Math.max(0, idealRemaining - dayCapacity);

      const actual = snapshotMap[dateStr] !== undefined ? snapshotMap[dateStr] : null;

      chartData.push({
        date: dateStr,
        ideal: idealRemaining,
        actual: actual
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { chartData, totalPulse };
  };

  const { chartData, totalPulse } = generateChartData();

  const formatDateForInput = (date: any) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  const totalCapacity = capacities.reduce((sum, c) => sum + c.pulseCount, 0);
  const totalPoints = sprintItems.reduce((sum, item) => sum + item.storyPoints, 0);
  
  // スプリント全体の合計実績Pulseと見積Pulse (PBIタスク + Todoタスク)
  const pbiActual = sprintItems.reduce((sum, item) => 
    sum + item.tasks.reduce((tSum: number, t: any) => tSum + t.actualPulse, 0), 0
  );
  const todoActual = todoTasks.reduce((sum, t) => sum + t.actualPulse, 0);
  const totalActualPulse = pbiActual + todoActual;

  const pbiEst = sprintItems.reduce((sum, item) => 
    sum + item.tasks.reduce((tSum: number, t: any) => tSum + t.estimatedPulse, 0), 0
  );
  const todoEst = todoTasks.reduce((sum, t) => sum + t.estimatedPulse, 0);
  const totalEstPulse = pbiEst + todoEst;

  const handlePulseChange = (id: string, delta: number) => {
    setCapacities(prev => prev.map(c => 
      c.id === id ? { ...c, pulseCount: Math.max(0, c.pulseCount + delta) } : c
    ));
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
    setNewTaskTitle(prev => ({ ...prev, [backlogItemId]: "" }));
    setNewTaskEst(prev => ({ ...prev, [backlogItemId]: 0 }));
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
          <Link href="/sprints" className={styles.backLink}>← Sprints</Link>
          <h1 className={styles.title}>{sprint.name}</h1>
          <span className={`${styles.status} ${styles[sprint.status]}`}>{sprint.status}</span>
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
          <span className={styles.statLabel}>総キャパシティ</span>
          <span className={styles.statValue}>{totalCapacity} P</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>予定 / 実績</span>
          <span className={styles.statValue}>{totalEstPulse} / {totalActualPulse} P</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>合計見積もり</span>
          <span className={styles.statValue}>{totalPoints} pts</span>
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
            {capacities.map((c) => (
              <div key={c.id} className={styles.capacityRow}>
                <div className={styles.dateInfo}>
                  <span className={styles.date}>{new Date(c.date).toLocaleDateString("ja-JP", { weekday: "short" })}</span>
                  <span className={styles.day}>{new Date(c.date).getDate()}</span>
                </div>
                <div className={styles.pulseControl}>
                  <button onClick={() => handlePulseChange(c.id, -1)} className={styles.pulseBtn}>-</button>
                  <span className={styles.pulseValue}>{c.pulseCount}</span>
                  <button onClick={() => handlePulseChange(c.id, 1)} className={styles.pulseBtn}>+</button>
                </div>
                <input 
                  type="text" 
                  placeholder="メモ（体調など）" 
                  className={styles.noteInput}
                  value={c.note || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCapacities(prev => prev.map(item => item.id === c.id ? { ...item, note: val } : item));
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.itemsSection}>
          <h2 className={styles.sectionTitle}>Sprint Backlog (by Items)</h2>
          <div className={styles.itemList}>
            {sprintItems.length === 0 ? (
              <p className={styles.empty}>アイテムがありません</p>
            ) : (
              sprintItems.map(item => (
                <div key={item.id} className={styles.itemGroup}>
                  <div className={styles.itemCard}>
                    <div className={styles.itemMain}>
                      <span className={styles.itemPoints}>{item.storyPoints} pts</span>
                      <span className={styles.itemTitle}>{item.title}</span>
                    </div>
                    <button 
                      onClick={() => removeItemFromSprintAction(sprint.id, item.id)}
                      className={styles.removeBtn}
                    >
                      外す
                    </button>
                  </div>

                  {/* タスク一覧 */}
                  <div className={styles.taskList}>
                    {item.tasks.map((task: any) => (
                      <div key={task.id} className={`${styles.taskRow} ${styles[task.status]}`}>
                        <div className={styles.taskStatusControl}>
                          <select 
                            value={task.status} 
                            onChange={(e) => updateTaskStatusAction(sprint.id, task.id, e.target.value as any)}
                            className={styles.statusSelect}
                          >
                            <option value="todo">TODO</option>
                            <option value="doing">DOING</option>
                            <option value="done">DONE</option>
                            <option value="pooled">POOLED</option>
                          </select>
                        </div>
                        <input 
                          type="text"
                          defaultValue={task.title}
                          className={styles.taskTitleInput}
                          onBlur={(e) => {
                            if (e.target.value !== task.title) {
                              updateTaskTitleAction(sprint.id, task.id, e.target.value);
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
                              <button onClick={() => updateTaskEstimatedPulseAction(sprint.id, task.id, task.estimatedPulse - 1)} className={styles.pulseBtnSmall}>-</button>
                              <span className={styles.pulseValueSmall}>{task.estimatedPulse}</span>
                              <button onClick={() => updateTaskEstimatedPulseAction(sprint.id, task.id, task.estimatedPulse + 1)} className={styles.pulseBtnSmall}>+</button>
                            </div>
                          </div>
                          
                          <div className={styles.pulseGroup}>
                            <span className={styles.pulseLabel}>Act:</span>
                            <div className={styles.taskPulseControl}>
                              <button onClick={() => updateTaskPulseAction(sprint.id, task.id, task.actualPulse - 1)} className={styles.pulseBtnSmall}>-</button>
                              <span className={styles.pulseValueSmall}>{task.actualPulse}</span>
                              <button onClick={() => updateTaskPulseAction(sprint.id, task.id, task.actualPulse + 1)} className={styles.pulseBtnSmall}>+</button>
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
                    
                    {/* タスク追加入力 */}
                    <div className={styles.addTaskRow}>
                      <input 
                        type="text" 
                        placeholder="新しいタスクを追加..." 
                        className={styles.addTaskInput}
                        value={newTaskTitle[item.id] || ""}
                        onChange={(e) => setNewTaskTitle(prev => ({ ...prev, [item.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTask(item.id)}
                      />
                      <div className={styles.addTaskEst}>
                        <input 
                          type="number" 
                          placeholder="Est" 
                          className={styles.estInput}
                          value={newTaskEst[item.id] || ""}
                          onChange={(e) => setNewTaskEst(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
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

          <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>Product Backlog (Available Items)</h2>
          <div className={styles.itemList}>
            {availableItems.length === 0 ? (
              <p className={styles.empty}>追加可能なアイテムはありません</p>
            ) : (
              availableItems.map(item => (
                <div key={item.id} className={styles.itemCard}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemPoints}>{item.storyPoints} pts</span>
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
          <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>Sprint General Tasks (ToDo)</h2>
          <div className={styles.itemList}>
            <div className={styles.itemGroup}>
              <div className={styles.taskList} style={{ paddingLeft: "1rem" }}>
                {todoTasks.map((todo: any) => (
                  <div key={todo.id} className={`${styles.taskRow} ${styles[todo.status]}`}>
                    <div className={styles.taskStatusControl}>
                        <select 
                         value={todo.status} 
                         onChange={(e) => updateTodoStatusAction(sprint.id, todo.id, e.target.value as any)}
                         className={styles.statusSelect}
                       >
                         <option value="todo">TODO</option>
                         <option value="doing">DOING</option>
                         <option value="done">DONE</option>
                         <option value="pooled">POOLED</option>
                       </select>
                    </div>
                    <input 
                      type="text"
                      defaultValue={todo.title}
                      className={styles.taskTitleInput}
                      onBlur={(e) => {
                        if (e.target.value !== todo.title) {
                          updateTodoTitleAction(sprint.id, todo.id, e.target.value);
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
                          const date = e.target.value ? new Date(e.target.value) : null;
                          updateTodoDeadlineAction(sprint.id, todo.id, date);
                        }}
                      />
                    </div>
                    <div className={styles.taskPulseControls}>
                      <div className={styles.pulseGroup}>
                        <span className={styles.pulseLabel}>Est:</span>
                        <div className={styles.taskPulseControl}>
                          <button onClick={() => updateTodoEstimatedPulseAction(sprint.id, todo.id, todo.estimatedPulse - 1)} className={styles.pulseBtnSmall}>-</button>
                          <span className={styles.pulseValueSmall}>{todo.estimatedPulse}</span>
                          <button onClick={() => updateTodoEstimatedPulseAction(sprint.id, todo.id, todo.estimatedPulse + 1)} className={styles.pulseBtnSmall}>+</button>
                        </div>
                      </div>
                      <div className={styles.pulseGroup}>
                        <span className={styles.pulseLabel}>Act:</span>
                        <div className={styles.taskPulseControl}>
                          <button onClick={() => updateTodoPulseAction(sprint.id, todo.id, todo.actualPulse - 1)} className={styles.pulseBtnSmall}>-</button>
                          <span className={styles.pulseValueSmall}>{todo.actualPulse}</span>
                          <button onClick={() => updateTodoPulseAction(sprint.id, todo.id, todo.actualPulse + 1)} className={styles.pulseBtnSmall}>+</button>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => unassignTodoTaskFromSprintAction(sprint.id, todo.id)}
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
                      onChange={(e) => setNewTodoEst(parseInt(e.target.value) || 0)}
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
          <h2 className={`${styles.sectionTitle} ${styles.backlogTitle}`}>Todo Task Pool (Unassigned)</h2>
          <div className={styles.itemList}>
            {unassignedTodoTasks.length === 0 ? (
              <p className={styles.empty}>未割当のTodoタスクはありません</p>
            ) : (
              unassignedTodoTasks.map((todo: any) => (
                <div key={todo.id} className={styles.itemCard}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemTitle}>{todo.title}</span>
                    {todo.deadline && (
                      <span className={styles.itemPoints}>
                        期限: {new Date(todo.deadline).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                    <span className={styles.itemPoints}>{todo.estimatedPulse} P</span>
                  </div>
                  <button 
                    onClick={() => assignTodoTaskToSprintAction(sprint.id, todo.id)}
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
    </div>
  );
}
