"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  createRecurringTaskAction,
  updateRecurringTaskAction,
  deleteRecurringTaskAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction
} from "./actions";
import styles from "./page.module.css";
import { RecurringPattern } from "@/domain/entities/RecurringTask";

interface CategoryData {
  id: string;
  name: string;
  color: string;
}

interface RecurringTaskData {
  id: string;
  categoryId: string;
  title: string;
  pattern: string;
  patternValue: string;
  estimatedPulse: number;
}

interface RecurringConfigBoardProps {
  initialTasks: RecurringTaskData[];
  initialCategories: CategoryData[];
}

export default function RecurringConfigBoard({
  initialTasks,
  initialCategories
}: RecurringConfigBoardProps) {
  const t = useTranslations("recurring");
  const tc = useTranslations("common");

  // --- State for Tasks ---
  const [editingTask, setEditingTask] = useState<RecurringTaskData | null>(null);
  const [taskPattern, setTaskPattern] = useState<RecurringPattern>("daily");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [monthlyValue, setMonthlyValue] = useState<string>("");

  // --- State for Categories ---
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);

  // --- Helpers for Task Pattern Value ---
  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleEditTaskClick = (task: RecurringTaskData) => {
    setEditingTask(task);
    setTaskPattern(task.pattern as RecurringPattern);
    if (task.pattern === "weekly") {
      setSelectedDays(task.patternValue.split(",").filter(Boolean));
    } else if (task.pattern === "monthly") {
      setMonthlyValue(task.patternValue);
    }
  };

  const handleCancelEditTask = () => {
    setEditingTask(null);
    setTaskPattern("daily");
    setSelectedDays([]);
    setMonthlyValue("");
  };

  const handlePatternChange = (pattern: RecurringPattern) => {
    setTaskPattern(pattern);
  };

  // --- Helpers for Category ---
  const handleEditCategoryClick = (cat: CategoryData) => {
    setEditingCategory(cat);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("title")}</h1>

      <div className={styles.flexLayout}>
        {/* --- Left Column: Recurring Tasks --- */}
        <section className={styles.configSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("recurringSection")}</h2>
          </div>

          <div className={styles.cardList}>
            {initialTasks.length === 0 ? (
              <p className={styles.empty}>{t("noRecurringTasks")}</p>
            ) : (
              initialTasks.map(task => {
                const category = initialCategories.find(c => c.id === task.categoryId);
                return (
                  <div key={task.id} className={styles.card}>
                    <div className={styles.cardMain}>
                      <div className={styles.cardHeaderRow}>
                        <h3 className={styles.cardTitle}>{task.title}</h3>
                        {category && (
                          <span
                            className={styles.categoryBadge}
                            style={{
                              backgroundColor: `${category.color}20`,
                              color: category.color,
                              border: `1px solid ${category.color}40`
                            }}
                          >
                            {category.name}
                          </span>
                        )}
                      </div>
                      <div className={styles.patternInfo}>
                        <span className={styles.patternLabel}>
                          {task.pattern === "daily" && t("patternDaily")}
                          {task.pattern === "weekly" && `${t("patternWeekly")} (${task.patternValue.split(",").map(d => t(`daysOfWeek.${d}`)).join(", ")})`}
                          {task.pattern === "monthly" && `${t("patternMonthly")} (${task.patternValue})`}
                        </span>
                        <span className={styles.pulseEst}>
                          ⚡ {task.estimatedPulse} Pulse
                        </span>
                      </div>
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => handleEditTaskClick(task)}
                        className={styles.editBtn}
                      >
                        {tc("edit")}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t("deleteRecurringConfirm"))) {
                            deleteRecurringTaskAction(task.id);
                          }
                        }}
                        className={styles.deleteBtn}
                      >
                        {tc("delete")}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form for Task Creation/Edit */}
          <div className={styles.formContainer}>
            <form
              action={async (formData) => {
                // patternValue を組み立ててセットする
                let val = "";
                if (taskPattern === "weekly") {
                  val = selectedDays.join(",");
                } else if (taskPattern === "monthly") {
                  val = monthlyValue;
                }
                formData.set("patternValue", val);

                if (editingTask) {
                  await updateRecurringTaskAction(editingTask.id, formData);
                  handleCancelEditTask();
                } else {
                  await createRecurringTaskAction(formData);
                  // Reset form
                  setSelectedDays([]);
                  setMonthlyValue("");
                }
              }}
              className={styles.form}
            >
              <h3 className={styles.formTitle}>
                {editingTask ? t("editRecurring") : t("createRecurring")}
              </h3>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("taskTitle")}</label>
                <input
                  name="title"
                  required
                  defaultValue={editingTask?.title || ""}
                  placeholder="e.g. 朝の読書"
                  className={styles.input}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("categoryLabel")}</label>
                  <select
                    name="categoryId"
                    className={styles.select}
                    defaultValue={editingTask?.categoryId || "default-category"}
                  >
                    {initialCategories.map(cat => (
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
                <label className={styles.label}>{t("pattern")}</label>
                <div className={styles.patternTabGroup}>
                  {(["daily", "weekly", "monthly"] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePatternChange(p)}
                      className={`${styles.patternTab} ${taskPattern === p ? styles.activeTab : ""}`}
                    >
                      <input
                        type="radio"
                        name="pattern"
                        value={p}
                        checked={taskPattern === p}
                        onChange={() => {}}
                        style={{ display: "none" }}
                      />
                      {p === "daily" && t("patternDaily")}
                      {p === "weekly" && t("patternWeekly")}
                      {p === "monthly" && t("patternMonthly")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Options (Day Selector) */}
              {taskPattern === "weekly" && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("patternValueLabel")}</label>
                  <div className={styles.daySelectorGrid}>
                    {["1", "2", "3", "4", "5", "6", "7"].map(dayVal => {
                      const isActive = selectedDays.includes(dayVal);
                      return (
                        <button
                          key={dayVal}
                          type="button"
                          onClick={() => handleDayToggle(dayVal)}
                          className={`${styles.dayBtn} ${isActive ? styles.activeDayBtn : ""}`}
                        >
                          {t(`daysOfWeek.${dayVal}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Monthly Options (Date Input) */}
              {taskPattern === "monthly" && (
                <div className={styles.inputGroup}>
                  <label className={styles.label}>{t("patternValueLabel")}</label>
                  <input
                    type="text"
                    value={monthlyValue}
                    onChange={e => setMonthlyValue(e.target.value)}
                    placeholder={t("patternValueMonthlyPlaceholder")}
                    className={styles.input}
                    required
                  />
                </div>
              )}

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.submitBtn}>
                  {editingTask ? tc("update") : tc("create")}
                </button>
                {editingTask && (
                  <button
                    type="button"
                    onClick={handleCancelEditTask}
                    className={styles.cancelBtn}
                  >
                    {tc("cancel")}
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* --- Right Column: Categories --- */}
        <section className={styles.configSection} style={{ flex: 1 }}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t("categorySection")}</h2>
          </div>

          <div className={styles.cardList}>
            {initialCategories.length === 0 ? (
              <p className={styles.empty}>{t("noCategories")}</p>
            ) : (
              initialCategories.map(cat => (
                <div key={cat.id} className={styles.card}>
                  <div className={styles.cardMain} style={{ flexDirection: "row", alignItems: "center", gap: "1rem" }}>
                    <div
                      className={styles.colorIndicator}
                      style={{ backgroundColor: cat.color }}
                    />
                    <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                      {cat.name}
                    </h3>
                  </div>
                  {cat.id !== "default-category" && (
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => handleEditCategoryClick(cat)}
                        className={styles.editBtn}
                      >
                        {tc("edit")}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t("deleteCategoryConfirm"))) {
                            deleteCategoryAction(cat.id);
                          }
                        }}
                        className={styles.deleteBtn}
                      >
                        {tc("delete")}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Form for Category Creation/Edit */}
          <div className={styles.formContainer}>
            <form
              action={async (formData) => {
                if (editingCategory) {
                  await updateCategoryAction(editingCategory.id, formData);
                  handleCancelEditCategory();
                } else {
                  await createCategoryAction(formData);
                }
              }}
              className={styles.form}
            >
              <h3 className={styles.formTitle}>
                {editingCategory ? t("editCategory") : t("createCategory")}
              </h3>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("taskTitle")}</label>
                <input
                  name="name"
                  required
                  defaultValue={editingCategory?.name || ""}
                  placeholder="e.g. 自己研鑽"
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("colorLabel")}</label>
                <div className={styles.colorPickerWrapper}>
                  <input
                    name="color"
                    type="color"
                    defaultValue={editingCategory?.color || "#4f46e5"}
                    className={styles.colorInput}
                  />
                  <span className={styles.colorInputLabel}>カラーを選択</span>
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <button type="submit" className={styles.submitBtn}>
                  {editingCategory ? tc("update") : tc("create")}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className={styles.cancelBtn}
                  >
                    {tc("cancel")}
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
