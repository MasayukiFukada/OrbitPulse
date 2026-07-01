"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  createIgniteTemplateAction,
  updateIgniteTemplateAction,
  deleteIgniteTemplateAction
} from "./actions";
import styles from "./page.module.css";

interface TemplateData {
  id: string;
  title: string;
  status: string;
  estimatedPulse: number;
  priority: number; // レアリティ: 0: C, 1: R, 2: SR, 3: SSR
}

interface IgniteTaskConfigBoardProps {
  initialTemplates: TemplateData[];
}

export default function IgniteTaskConfigBoard({
  initialTemplates
}: IgniteTaskConfigBoardProps) {
  const t = useTranslations("igniteSettings");
  const ti = useTranslations("ignite");
  const tc = useTranslations("common");

  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);

  // レアリティのラベルとカラー
  const getRarityInfo = (priority: number) => {
    switch (priority) {
      case 3:
        return { label: ti("rarityUltraRare"), color: "#ff9800", bg: "rgba(255, 152, 0, 0.1)", border: "#ff9800" };
      case 2:
        return { label: ti("raritySuperRare"), color: "#9c27b0", bg: "rgba(156, 39, 176, 0.1)", border: "#9c27b0" };
      case 1:
        return { label: ti("rarityRare"), color: "#2196f3", bg: "rgba(33, 150, 243, 0.1)", border: "#2196f3" };
      case 0:
      default:
        return { label: ti("rarityCommon"), color: "#9e9e9e", bg: "rgba(158, 158, 158, 0.1)", border: "#9e9e9e" };
    }
  };

  // レアリティごとにグルーピング
  const groupedTemplates: { [key: number]: TemplateData[] } = {
    3: [], // SSR
    2: [], // SR
    1: [], // R
    0: []  // C
  };

  initialTemplates.forEach(template => {
    const p = template.priority;
    if (groupedTemplates[p] !== undefined) {
      groupedTemplates[p].push(template);
    } else {
      groupedTemplates[0].push(template);
    }
  });

  const handleEditClick = (template: TemplateData) => {
    setEditingTemplate(template);
  };

  const handleCancelEdit = () => {
    setEditingTemplate(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>{t("title")}</h1>
      </div>

      <div className={styles.flexLayout}>
        {/* --- Left Column: Candidate List --- */}
        <div className={styles.listColumn}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("sectionTitle")}</h2>

            {initialTemplates.length === 0 ? (
              <p className={styles.empty}>{t("noTasks")}</p>
            ) : (
              [3, 2, 1, 0].map(rarityLevel => {
                const list = groupedTemplates[rarityLevel];
                if (list.length === 0) return null;

                const rInfo = getRarityInfo(rarityLevel);

                return (
                  <div key={rarityLevel} className={styles.backlogGroup} style={{ borderLeft: `5px solid ${rInfo.color}` }}>
                    <h4 className={styles.backlogGroupTitle} style={{ color: rInfo.color }}>
                      ✨ {rInfo.label} ({list.length})
                    </h4>
                    <div className={styles.cardList}>
                      {list.map(template => (
                        <div key={template.id} className={styles.taskCard} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                          <div>
                            <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--text-main)" }}>{template.title}</span>

                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => handleEditClick(template)}
                              className={styles.editBtn}
                              style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem" }}
                            >
                              {tc("edit")}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(t("deleteConfirm"))) {
                                  deleteIgniteTemplateAction(template.id);
                                }
                              }}
                              className={styles.deleteBtn}
                              style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem" }}
                            >
                              {tc("delete")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>

        {/* --- Right Column: Edit/Create Form --- */}
        <div className={styles.formColumn}>
          <div className={styles.stickyForm}>
            {editingTemplate ? (
              // EDIT FORM
              <div className={styles.formCard}>
                <h3 className={styles.formCardTitle}>✍️ {t("editTask")}</h3>
                <form
                  action={async (formData) => {
                    await updateIgniteTemplateAction(editingTemplate.id, formData);
                    setEditingTemplate(null);
                  }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("taskTitle")}</label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={editingTemplate.title}
                      required
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("rarityLabel")}</label>
                    <select
                      name="priority"
                      defaultValue={editingTemplate.priority}
                      className={styles.select}
                    >
                      <option value="0">{ti("rarityCommon")}</option>
                      <option value="1">{ti("rarityRare")}</option>
                      <option value="2">{ti("raritySuperRare")}</option>
                      <option value="3">{ti("rarityUltraRare")}</option>
                    </select>
                  </div>



                  <div className={styles.btnRow}>
                    <button type="submit" className={styles.submitBtn}>
                      {tc("save")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={styles.cancelBtn}
                    >
                      {tc("cancel")}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // CREATE FORM
              <div className={styles.formCard}>
                <h3 className={styles.formCardTitle}>✨ {t("createTask")}</h3>
                <form
                  action={async (formData) => {
                    await createIgniteTemplateAction(formData);
                    // フォームリセット
                    const form = document.querySelector("form");
                    if (form) form.reset();
                  }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("taskTitle")}</label>
                    <input
                      type="text"
                      name="title"
                      placeholder="例: 深呼吸を3回する"
                      required
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("rarityLabel")}</label>
                    <select name="priority" className={styles.select} defaultValue="0">
                      <option value="0">{ti("rarityCommon")}</option>
                      <option value="1">{ti("rarityRare")}</option>
                      <option value="2">{ti("raritySuperRare")}</option>
                      <option value="3">{ti("rarityUltraRare")}</option>
                    </select>
                  </div>



                  <button type="submit" className={styles.submitBtn}>
                    {tc("create")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
