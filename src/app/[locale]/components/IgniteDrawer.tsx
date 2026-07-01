"use client";

import { useTranslations } from "next-intl";
import { useIgnite } from "./IgniteContext";
import styles from "./IgniteDrawer.module.css";
import { useState } from "react";
import { completeIgniteTaskAction } from "../ignite/actions";

export default function IgniteDrawer() {
  const {
    isIgniteOpen,
    closeIgnite,
    activeTask,
    drawGacha,
    isDrawing
  } = useIgnite();

  const t = useTranslations("ignite");
  const tc = useTranslations("common");

  const [rolledTask, setRolledTask] = useState<{ title: string; priority: number } | null>(null);

  if (!isIgniteOpen) return null;

  // レアリティごとのデザイン設定
  const getRarityStyle = (priority: number) => {
    switch (priority) {
      case 3: // SSR
        return { label: t("rarityUltraRare"), color: "#ff9800", shadow: "0 0 25px rgba(255, 152, 0, 0.6)", cardClass: styles.cardSSR };
      case 2: // SR
        return { label: t("raritySuperRare"), color: "#9c27b0", shadow: "0 0 20px rgba(156, 39, 176, 0.5)", cardClass: styles.cardSR };
      case 1: // R
        return { label: t("rarityRare"), color: "#2196f3", shadow: "0 0 15px rgba(33, 150, 243, 0.4)", cardClass: styles.cardR };
      case 0: // C
      default:
        return { label: t("rarityCommon"), color: "#9e9e9e", shadow: "0 0 10px rgba(158, 158, 158, 0.2)", cardClass: styles.cardC };
    }
  };

  const handleDraw = async () => {
    setRolledTask(null);
    const task = await drawGacha();
    if (task) {
      setRolledTask({ title: task.title, priority: task.priority });
    }
  };

  const handleComplete = async () => {
    if (activeTask) {
      await completeIgniteTaskAction(activeTask.id);
      closeIgnite();
    }
  };

  const currentTask = activeTask || rolledTask;
  const rStyle = currentTask ? getRarityStyle(currentTask.priority) : null;

  return (
    <div className={styles.overlay} onClick={closeIgnite}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={closeIgnite}>✕</button>
        
        <h2 className={styles.drawerTitle}>⚡ {t("title")}</h2>

        <div className={styles.contentContainer}>
          {isDrawing ? (
            /* ガチャ演出アニメーション */
            <div className={styles.gachaAnimation}>
              <div className={styles.cosmicSphere}></div>
              <p className={styles.cosmicText}>モチベーション点火中...</p>
            </div>
          ) : currentTask && rStyle ? (
            /* ガチャ結果または現在のアクティブなタスク */
            <div className={styles.resultContainer}>
              <h3 className={styles.sectionHeader}>
                {activeTask ? t("currentRitual") : "召喚結果！"}
              </h3>

              <div 
                className={`${styles.ritualCard} ${rStyle.cardClass}`}
                style={{ boxShadow: rStyle.shadow }}
              >
                <span className={styles.rarityBadge} style={{ color: rStyle.color, borderColor: rStyle.color }}>
                  {rStyle.label}
                </span>
                <h1 className={styles.ritualTitle}>{currentTask.title}</h1>
                <p className={styles.ritualDesc}>
                  この作業を終わらせて、本番のタスクへ勢いよく飛び込もう！
                </p>
              </div>

              <div className={styles.actionBlock}>
                {activeTask && (
                  <button className={styles.startBtn} onClick={closeIgnite}>
                    🔥 ボードに追加する！
                  </button>
                )}
                <button className={styles.rerollBtn} onClick={handleDraw}>
                  {t("drawReroll")}
                </button>
              </div>
            </div>
          ) : (
            /* ガチャを引く初期状態 */
            <div className={styles.initialContainer}>
              <p className={styles.introText}>
                やる気が出ない？<br />
                宇宙の力で、数分で終わるモチベーション点火の「儀式」を召喚しよう。
              </p>
              <button className={styles.drawBtn} onClick={handleDraw}>
                🔮 {t("drawRitual")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
