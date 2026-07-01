"use client";

import { ReactNode, useEffect, useRef } from "react";
import { PomodoroProvider, usePomodoro } from "../sprints/[id]/PomodoroContext";
import { IgniteProvider } from "./IgniteContext";
import { completeGlobalPomodoroAction } from "../ignite/actions";
import { useTranslations } from "next-intl";
import PomodoroTimer from "../sprints/[id]/PomodoroTimer";
import IgniteDrawer from "./IgniteDrawer";

// グローバルにポモドーロの終了を監視・処理するリスナー
function GlobalPomodoroListener() {
  const { state, timeLeft, startBreak, stopPomodoro } = usePomodoro();
  const t = useTranslations("pomodoro");
  const prevTimeLeft = useRef(timeLeft);

  const sendNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/images/OrbitPulse_Logo.png" });
    }
  };

  useEffect(() => {
    const handleTimerEnd = async () => {
      if (state.status === "work") {
        sendNotification(
          t('workEndedTitle'),
          t('workEndedBody', { workMinutes: 25, breakMinutes: 5 })
        );
        startBreak(5); // 5分休憩
        if (state.taskId) {
          // 実績Pulseをグローバルアクションで安全に更新
          await completeGlobalPomodoroAction(state.taskId);
        }
      } else if (state.status === "break") {
        sendNotification(t('breakEndedTitle'), t('breakEndedBody'));
        stopPomodoro();
      }
    };

    if (timeLeft === 0 && prevTimeLeft.current > 0) {
      handleTimerEnd();
    }
    prevTimeLeft.current = timeLeft;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, state.status, state.taskId, state.isTodoTask]);

  return null;
}

export function GlobalProviders({ children }: { children: ReactNode }) {
  return (
    <PomodoroProvider>
      <IgniteProvider>
        <GlobalPomodoroListener />
        <PomodoroTimer />
        <IgniteDrawer />
        {children}
      </IgniteProvider>
    </PomodoroProvider>
  );
}
