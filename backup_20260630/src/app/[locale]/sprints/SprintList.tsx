"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  createSprintAction,
  updateSprintAction,
  deleteSprintAction,
  updateCapacitiesAction,
} from "./actions";
import styles from "./page.module.css";
import Link from "next/link";
import { Sprint } from "@/domain/entities/Sprint";
import { Capacity } from "@/domain/entities/Capacity";

interface SprintWithCapacities extends Sprint {
  capacities: Capacity[];
}

interface SprintListProps {
  initialSprints: SprintWithCapacities[];
}

type SprintState = {
  isCollapsed: boolean;
  showCapacity: boolean;
};

export default function SprintList({ initialSprints }: SprintListProps) {
  const [editingSprint, setEditingSprint] = useState<SprintWithCapacities | null>(null);
  const [sprintStates, setSprintStates] = useState<Record<string, SprintState>>(
    initialSprints.reduce((acc, sprint) => ({ 
      ...acc, 
      [sprint.id]: { isCollapsed: true, showCapacity: false } 
    }), {})
  );
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const locale = useLocale();
  const t = useTranslations("sprints");
  const tc = useTranslations("common");

  useEffect(() => {
    fetch("https://holidays-jp.github.io/api/v1/date.json")
      .then((res) => res.json())
      .then((data: { [key: string]: string }) => {
        setHolidays(new Set(Object.keys(data)));
      })
      .catch(() => {});
  }, []);

  const toggleCollapse = (id: string) => {
    setSprintStates((prev) => {
      const current = prev[id] || { isCollapsed: true, showCapacity: false };
      return {
        ...prev,
        [id]: { ...current, isCollapsed: !current.isCollapsed }
      };
    });
  };

  const toggleCapacity = (id: string) => {
    setSprintStates((prev) => {
      const current = prev[id] || { isCollapsed: true, showCapacity: false };
      return {
        ...prev,
        [id]: { ...current, showCapacity: !current.showCapacity }
      };
    });
  };

  // 日付を input[type="date"] 用の yyyy-mm-dd 形式に変換
  const formatDateForInput = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("title")}</h1>

      <div className={styles.flexLayout}>
        <section className={styles.sprintList}>
          {initialSprints.length === 0 ? (
            <p className={styles.empty}>
              {t("noSprints")}
            </p>
          ) : (
            initialSprints.map((sprint) => {
              const state = sprintStates[sprint.id] || { isCollapsed: true, showCapacity: false };
              
              return (
                <div key={sprint.id} className={`${styles.card} ${state.isCollapsed ? styles.collapsed : ""}`}>
                  <div className={styles.cardHeader}>
                    <div className={styles.headerTitleGroup}>
                      <button 
                        onClick={() => toggleCollapse(sprint.id)}
                        className={styles.toggleBtn}
                        title="Toggle collapse"
                      >
                        {state.isCollapsed ? "▶" : "▼"}
                      </button>
                      <h3 className={styles.sprintName}>{sprint.name}</h3>
                    </div>
                    <span className={`${styles.status} ${styles[sprint.status]}`}>
                      {sprint.status}
                    </span>
                  </div>

                  {!state.isCollapsed && (
                    <>
                      <div className={styles.period}>
                        {new Date(sprint.startDate).toLocaleDateString()} 〜{" "}
                        {new Date(sprint.endDate).toLocaleDateString()}
                      </div>

                      {sprint.goal && (
                        <div className={styles.goalSection}>
                          <strong>{t("goalLabel")}</strong> {sprint.goal}
                        </div>
                      )}

                      <div className={styles.capacityToggleRow}>
                        <button 
                          className={styles.capacityLinkBtn}
                          onClick={() => toggleCapacity(sprint.id)}
                        >
                          {state.showCapacity ? "▲ " : "▼ "}
                          {t("capacities")}
                        </button>
                      </div>

                      {state.showCapacity && (
                        <CapacityEditor 
                          sprintId={sprint.id} 
                          initialCapacities={sprint.capacities}
                          holidays={holidays}
                        />
                      )}

                      <div className={styles.cardActions}>
                        <Link
                          href={`/${locale}/sprints/${sprint.id}`}
                          className={styles.detailLink}
                        >
                          {t("planning")}
                        </Link>
                        <div className={styles.cardSecondaryActions}>
                          <button
                            onClick={() => {
                              setEditingSprint(sprint);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className={styles.editButton}
                          >
                            {tc("edit")}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(t("deleteConfirm"))) {
                                deleteSprintAction(sprint.id);
                              }
                            }}
                            className={styles.deleteButton}
                          >
                            {tc("delete")}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>

        <section className={styles.formSection}>
          <form
            action={async (formData) => {
              if (editingSprint) {
                await updateSprintAction(editingSprint.id, formData);
                setEditingSprint(null);
              } else {
                await createSprintAction(formData);
              }
            }}
            className={styles.form}
          >
            <h2 className={styles.formTitle}>
              {editingSprint
                ? t("editTitle")
                : t("createTitle")
              }
            </h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("nameLabel")}</label>
              <input
                name="name"
                required
                className={styles.input}
                placeholder={t("namePlaceholder")}
                defaultValue={editingSprint?.name || ""}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("startDate")}</label>
                <input
                  name="startDate"
                  type="date"
                  required
                  className={styles.input}
                  defaultValue={
                    editingSprint
                      ? formatDateForInput(editingSprint.startDate)
                      : ""
                  }
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>{t("endDate")}</label>
                <input
                  name="endDate"
                  type="date"
                  required
                  className={styles.input}
                  defaultValue={
                    editingSprint
                      ? formatDateForInput(editingSprint.endDate)
                      : ""
                  }
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>{t("goalLabel")}</label>
              <textarea
                name="goal"
                className={styles.textarea}
                placeholder={t("goalPlaceholder")}
                defaultValue={editingSprint?.goal || ""}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.button}>
                {editingSprint ? tc("update") : t("createButton")}
              </button>
              {editingSprint && (
                <button
                  type="button"
                  onClick={() => setEditingSprint(null)}
                  className={styles.cancelButton}
                >
                  {tc("cancel")}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

function CapacityEditor({ 
  sprintId, 
  initialCapacities,
  holidays
}: { 
  sprintId: string; 
  initialCapacities: Capacity[];
  holidays: Set<string>;
}) {
  const [capacities, setCapacities] = useState(initialCapacities);
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("sprints");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePulseChange = (id: string, delta: number) => {
    setCapacities((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, pulseCount: Math.max(0, c.pulseCount + delta) }
          : c,
      ),
    );
  };

  const saveCapacities = async () => {
    setIsSaving(true);
    await updateCapacitiesAction(sprintId, capacities);
    setIsSaving(false);
  };

  return (
    <div className={styles.capacityEditor}>
      <div className={styles.capacityEditorHeader}>
        <h4 className={styles.capacityEditorTitle}>{t("capacities")}</h4>
        <button
          onClick={saveCapacities}
          disabled={isSaving}
          className={styles.saveCapacityBtn}
        >
          {isSaving ? t("saving") : t("saveCapacity")}
        </button>
      </div>
      <div className={styles.capacityListList}>
        {capacities.map((c) => {
          const d = new Date(c.date);
          const dayOfWeek = d.getDay();
          const isSat = dayOfWeek === 6;
          const isSun = dayOfWeek === 0;
          
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;
          const isHoliday = holidays.has(dateStr);
          
          const checkDate = new Date(c.date);
          checkDate.setHours(0, 0, 0, 0);
          const isToday = checkDate.getTime() === today.getTime();
          
          return (
            <div key={c.id} className={`${styles.capacityRowList} ${isToday ? styles.todayRow : ""}`}>
              <div className={styles.dateInfoCompact}>
                <span className={`${styles.dayName} ${isSat ? styles.saturday : ""} ${isSun ? styles.sunday : ""} ${isHoliday ? styles.holiday : ""}`}>
                  {d.toLocaleDateString("ja-JP", { weekday: "short" })}
                </span>
                <span className={`${styles.dayNumber} ${isSat ? styles.saturday : ""} ${isSun ? styles.sunday : ""} ${isHoliday ? styles.holiday : ""}`}>
                  {d.getDate()}
                </span>
              </div>
              <div className={styles.pulseControlCompact}>
                <button onClick={() => handlePulseChange(c.id, -1)} className={styles.pulseBtnMini}>-</button>
                <span className={styles.pulseValueMini}>{c.pulseCount}</span>
                <button onClick={() => handlePulseChange(c.id, 1)} className={styles.pulseBtnMini}>+</button>
              </div>
              <input
                type="text"
                className={styles.noteInputList}
                value={c.note || ""}
                placeholder="Note"
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
    </div>
  );
}
