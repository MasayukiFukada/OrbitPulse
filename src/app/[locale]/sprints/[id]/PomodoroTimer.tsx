"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import styles from "./PomodoroTimer.module.css";
import { usePomodoro } from "./PomodoroContext";

interface PomodoroTimerProps {
  onComplete: (taskId: string, isTodoTask: boolean) => Promise<void>;
  defaultWorkMinutes?: number;
  defaultBreakMinutes?: number;
}

export default function PomodoroTimer({
  onComplete,
  defaultWorkMinutes = 25,
  defaultBreakMinutes = 5,
}: PomodoroTimerProps) {
  const { state, timeLeft, startBreak, stopPomodoro } = usePomodoro();
  const t = useTranslations("pomodoro");
  const prevTimeLeft = useRef(timeLeft);

  const sendNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/images/OrbitPulse_Logo.png" });
    }
  };

  const handleTimerEnd = async () => {
    if (state.status === "work") {
      sendNotification(t('workEndedTitle'), t('workEndedBody', { workMinutes: defaultWorkMinutes, breakMinutes: defaultBreakMinutes }));
      startBreak(defaultBreakMinutes);
      if (state.taskId) {
        await onComplete(state.taskId, state.isTodoTask);
      }
    } else if (state.status === "break") {
      sendNotification(t('breakEndedTitle'), t('breakEndedBody'));
      stopPomodoro();
    }
  };

  useEffect(() => {
    if (timeLeft === 0 && prevTimeLeft.current > 0) {
      handleTimerEnd();
    }
    prevTimeLeft.current = timeLeft;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const cancelTimer = () => {
    if (confirm(t('cancelConfirm'))) {
      stopPomodoro();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

   const isBreak = state.status === "break";
   const isBreakEnded = timeLeft === 0 && state.status === "break";

  if (state.status === "idle" || isBreakEnded) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.timerCard}>
        <h3 className={`${styles.statusText} ${isBreak ? styles.breakText : ""}`}>
          {isBreak ? t('statusBreak') : t('statusWork')}
        </h3>
        <div className={`${styles.taskTitle} ${isBreak ? styles.breakText : ""}`}>{state.taskTitle}</div>
        <div className={`${styles.timeDisplay} ${isBreak ? styles.breakText : ""}`}>{formatTime(timeLeft)}</div>
        <div className={styles.controls}>
          <button onClick={cancelTimer} className={styles.cancelBtn}>
            {t('cancelButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
