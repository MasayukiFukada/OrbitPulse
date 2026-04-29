"use client";

import { useState } from "react";
import {
  createSprintAction,
  updateSprintAction,
  deleteSprintAction,
} from "./actions";
import styles from "./page.module.css";
import Link from "next/link";
import type { Sprint } from "@/infrastructure/db/schema";

interface SprintListProps {
  initialSprints: Sprint[];
}

export default function SprintList({ initialSprints }: SprintListProps) {
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

  // 日付を input[type="date"] 用の yyyy-mm-dd 形式に変換
  const formatDateForInput = (date: Date) => {
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Sprints</h1>

      <div className={styles.flexLayout}>
        <section className={styles.sprintList}>
          {initialSprints.length === 0 ? (
            <p className={styles.empty}>
              まだスプリントはありません。新しい計画を立てましょう！
            </p>
          ) : (
            initialSprints.map((sprint) => (
              <div key={sprint.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.sprintName}>{sprint.name}</h3>
                  <span className={`${styles.status} ${styles[sprint.status]}`}>
                    {sprint.status}
                  </span>
                </div>

                <div className={styles.period}>
                  {new Date(sprint.startDate).toLocaleDateString()} 〜{" "}
                  {new Date(sprint.endDate).toLocaleDateString()}
                </div>

                {sprint.goal && (
                  <div className={styles.goalSection}>
                    <strong>Goal:</strong> {sprint.goal}
                  </div>
                )}

                <div className={styles.cardActions}>
                  <Link
                    href={`/sprints/${sprint.id}`}
                    className={styles.detailLink}
                  >
                    プランニング
                  </Link>
                  <div className={styles.cardSecondaryActions}>
                    <button
                      onClick={() => {
                        setEditingSprint(sprint);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={styles.editButton}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "スプリントを削除してもええか？（紐付いてるキャパシティも消えるで）",
                          )
                        ) {
                          deleteSprintAction(sprint.id);
                        }
                      }}
                      className={styles.deleteButton}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))
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
                ? "スプリントを編集"
                : "新しいスプリントを計画する"}
            </h2>

            <div className={styles.inputGroup}>
              <label className={styles.label}>スプリント名</label>
              <input
                name="name"
                required
                className={styles.input}
                placeholder="例: 第1回 軌道投入"
                defaultValue={editingSprint?.name || ""}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>開始日</label>
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
                <label className={styles.label}>終了日</label>
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
              <label className={styles.label}>スプリントゴール (Why)</label>
              <textarea
                name="goal"
                className={styles.textarea}
                placeholder="このスプリントで何を成し遂げたい？"
                defaultValue={editingSprint?.goal || ""}
              />
            </div>

            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.button}>
                {editingSprint ? "更新する" : "スプリント作成"}
              </button>
              {editingSprint && (
                <button
                  type="button"
                  onClick={() => setEditingSprint(null)}
                  className={styles.cancelButton}
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
