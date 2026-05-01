"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type PomodoroStatus = "idle" | "work" | "break";

interface PomodoroState {
  taskId: string | null;
  taskTitle: string | null;
  isTodoTask: boolean;
  status: PomodoroStatus;
  startTime: number | null; // 開始時刻のタイムスタンプ
  duration: number; // 設定された秒数（作業または休憩）
}

interface PomodoroContextType {
  state: PomodoroState;
  timeLeft: number;
  startPomodoro: (taskId: string, taskTitle: string, isTodoTask: boolean, workMinutes: number) => void;
  startBreak: (breakMinutes: number) => void;
  stopPomodoro: () => void;
}

const STORAGE_KEY = "orbitpulse_pomodoro_state";

const DEFAULT_STATE: PomodoroState = {
  taskId: null,
  taskTitle: null,
  isTodoTask: false,
  status: "idle",
  startTime: null,
  duration: 0,
};

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>(DEFAULT_STATE);
  const [timeLeft, setTimeLeft] = useState(0);

  // 初期読み込み
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PomodoroState;
        setState(parsed);
      } catch (e) {
        console.error("Failed to parse pomodoro state", e);
      }
    }
  }, []);

  // 永続化
  useEffect(() => {
    if (state.status === "idle") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // カウントダウン処理
  useEffect(() => {
    if (state.status === "idle" || !state.startTime) {
      setTimeLeft(0);
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - state.startTime!) / 1000);
      const remaining = Math.max(0, state.duration - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        // タイマー終了のイベント発火（ここではステータス変更は行わず、各コンポーネントで検知させる）
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [state.status, state.startTime, state.duration]);

  // 他のタブからの変更を検知
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          setState(JSON.parse(e.newValue));
        } else {
          setState(DEFAULT_STATE);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const startPomodoro = useCallback((taskId: string, taskTitle: string, isTodoTask: boolean, workMinutes: number) => {
    const newState: PomodoroState = {
      taskId,
      taskTitle,
      isTodoTask,
      status: "work",
      startTime: Date.now(),
      duration: workMinutes * 60,
    };
    setState(newState);
  }, []);

  const startBreak = useCallback((breakMinutes: number) => {
    setState((prev) => ({
      ...prev,
      status: "break",
      startTime: Date.now(),
      duration: breakMinutes * 60,
    }));
  }, []);

  const stopPomodoro = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return (
    <PomodoroContext.Provider value={{ state, timeLeft, startPomodoro, startBreak, stopPomodoro }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return context;
}
