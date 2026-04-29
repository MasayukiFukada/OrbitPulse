"use client";

import { useState } from "react";
import { BacklogItem } from "@/domain/entities/BacklogItem";
import BacklogForm from "./BacklogForm";
import { deleteBacklogItemAction } from "./actions";
import styles from "./page.module.css";

interface BacklogListProps {
  initialItems: BacklogItem[];
}

export default function BacklogList({ initialItems }: BacklogListProps) {
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>OrbitPulse Backlog</h1>

      <div className={styles.flexLayout}>
        <section className={styles.itemList}>
          {initialItems.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999" }}>
              まだバックログはありません。最初の野望を登録しましょう！
            </p>
          ) : (
            initialItems.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.itemTitle}>
                    {item.subject}は{item.title}
                  </h2>
                  <span className={styles.points}>{item.storyPoints} pts</span>
                </div>

                <div className={styles.whySection}>
                  <strong>なぜなら:</strong> {item.why}
                </div>

                {item.description && (
                  <div className={styles.details}>
                    <strong>Description:</strong>
                    <p className={styles.description}>{item.description}</p>
                  </div>
                )}

                {item.acceptanceCriteria && (
                  <div className={styles.details}>
                    <strong>Acceptance Criteria:</strong>
                    <p className={styles.acceptanceCriteria}>
                      {item.acceptanceCriteria}
                    </p>
                  </div>
                )}

                <div className={styles.cardActions}>
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={styles.editButton}
                  >
                    編集
                  </button>
                  <form action={deleteBacklogItemAction.bind(null, item.id)}>
                    <button type="submit" className={styles.deleteButton}>
                      削除
                    </button>
                  </form>
                </div>
              </div>
            ))
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
