"use client";

import { usePomodoro } from "./PomodoroContext";
import styles from "./PomodoroTimer.module.css";

export default function PomodoroStatusDisplay() {
  const { state, timeLeft } = usePomodoro();
  const isBreak = state.status === "break";
  const isBreakEnded = timeLeft === 0 && state.status === "break";

  if (state.status === "idle" || isBreakEnded) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`${styles.statusBanner} ${isBreak ? styles.breakBanner : ""}`}>
      <span className={styles.statusLabel}>
        {isBreak ? "☕ 休憩中" : "🔥 作業中"}:
      </span>
      <span className={styles.statusTask}>{state.taskTitle}</span>
      <span className={styles.statusTime}>{formatTime(timeLeft)}</span>
    </div>
  );
}
