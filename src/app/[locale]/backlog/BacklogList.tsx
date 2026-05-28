"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BacklogItem } from "@/domain/entities/BacklogItem";
import BacklogForm from "./BacklogForm";
import { deleteBacklogItemAction } from "./actions";
import styles from "./page.module.css";

interface BacklogItemWithStats extends BacklogItem {
  taskStats: {
    total: number;
    done: number;
    pooled: number;
    todo: number;
    doing: number;
  };
}

interface BacklogListProps {
  initialItems: BacklogItemWithStats[];
}

export default function BacklogList({ initialItems }: BacklogListProps) {
  const [editingItem, setEditingItem] = useState<BacklogItemWithStats | null>(
    null,
  );
  const [itemStates, setItemStates] = useState<
    Record<string, { isCollapsed: boolean }>
  >(
    initialItems.reduce(
      (acc, item) => ({
        ...acc,
        [item.id]: { isCollapsed: true },
      }),
      {},
    ),
  );
  const t = useTranslations("backlog");
  const tc = useTranslations("common");

  const toggleCollapse = (id: string) => {
    setItemStates((prev) => {
      const current = prev[id] || { isCollapsed: true };
      return {
        ...prev,
        [id]: { isCollapsed: !current.isCollapsed },
      };
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>OrbitPulse {t("title")}</h1>

      <div className={styles.flexLayout}>
        <section className={styles.itemList}>
          {initialItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999" }}>
              {t("noBacklogs")}
            </p>
          ) : (
            initialItems.map((item) => {
              const state = itemStates[item.id] || { isCollapsed: true };

              return (
                <div
                  key={item.id}
                  className={`${styles.card} ${state.isCollapsed ? styles.collapsed : ""}`}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.headerTitleGroup}>
                      <button
                        onClick={() => toggleCollapse(item.id)}
                        className={styles.toggleBtn}
                        title="Toggle collapse"
                      >
                        {state.isCollapsed ? "▶" : "▼"}
                      </button>
                      <h2 className={styles.itemTitle}>
                        {item.subject}
                        {t("subjectTitleSeparator")}
                        {item.title}
                      </h2>

                      {item.taskStats &&
                        item.taskStats.total > 0 &&
                        item.taskStats.done === item.taskStats.total && (
                          <span
                            className={styles.completedBadge}
                            title={t("completedBadge")}
                          >
                            ✓ {t("completedBadge")}
                          </span>
                        )}
                    </div>
                    <span className={styles.points}>
                      {item.storyPoints} pts
                    </span>
                  </div>

                  {!state.isCollapsed && (
                    <>
                      <div className={styles.whySection}>
                        <strong>{t("whyLabel")}</strong> {item.why}
                      </div>

                      {item.description && (
                        <div className={styles.details}>
                          <strong>{t("descriptionLabel")}</strong>
                          <p className={styles.description}>
                            {item.description}
                          </p>
                        </div>
                      )}

                      {item.acceptanceCriteria && (
                        <div className={styles.details}>
                          <strong>{t("acceptanceCriteriaLabel")}</strong>
                          <p className={styles.acceptanceCriteria}>
                            {item.acceptanceCriteria}
                          </p>
                        </div>
                      )}

                      <div className={styles.taskStats}>
                        <strong>{t("taskStatus")}</strong>
                        <div className={styles.statsGrid}>
                          <span className={styles.statItem}>
                            {t("total")}: {item.taskStats.total}
                          </span>
                          <span className={styles.statItem}>
                            {t("done")}: {item.taskStats.done}
                          </span>
                          <span className={styles.statItem}>
                            {t("doing")}: {item.taskStats.doing}
                          </span>
                          <span className={styles.statItem}>
                            {t("todo")}: {item.taskStats.todo}
                          </span>
                          <span className={styles.statItem}>
                            {t("pooled")}: {item.taskStats.pooled}
                          </span>
                        </div>
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={styles.editButton}
                        >
                          {tc("edit")}
                        </button>
                        <form
                          action={deleteBacklogItemAction.bind(null, item.id)}
                        >
                          <button type="submit" className={styles.deleteButton}>
                            {tc("delete")}
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </section>

        <section className={styles.formSection}>
          <BacklogForm
            editItem={editingItem}
            onCancel={() => setEditingItem(null)}
          />
        </section>
      </div>
    </div>
  );
}
