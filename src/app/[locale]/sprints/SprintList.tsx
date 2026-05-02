"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
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
  const locale = useLocale();
  const t = useTranslations("sprints");
  const tc = useTranslations("common");

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
                    <strong>{t("goalLabel")}</strong> {sprint.goal}
                  </div>
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
                        if (
                          confirm(t("deleteConfirm"))
                        ) {
                          deleteSprintAction(sprint.id);
                        }
                      }}
                      className={styles.deleteButton}
                    >
                      {tc("delete")}
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
