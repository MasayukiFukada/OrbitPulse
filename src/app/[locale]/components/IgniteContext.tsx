"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getIgniteActiveTaskAction, drawIgniteGachaAction, cleanUpIgniteTasksAction } from "../ignite/actions";

interface IgniteTask {
  id: string;
  title: string;
  status: string;
  estimatedPulse: number;
  priority: number;
  createdAt: string;
}

interface IgniteContextType {
  isIgniteOpen: boolean;
  openIgnite: () => void;
  closeIgnite: () => void;
  activeTask: IgniteTask | null;
  drawGacha: () => Promise<IgniteTask | null>;
  refreshActiveTask: () => Promise<void>;
  isDrawing: boolean;
}

const IgniteContext = createContext<IgniteContextType | undefined>(undefined);

export function IgniteProvider({ children }: { children: React.ReactNode }) {
  const [isIgniteOpen, setIsIgniteOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<IgniteTask | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const openIgnite = useCallback(() => setIsIgniteOpen(true), []);
  const closeIgnite = useCallback(() => setIsIgniteOpen(false), []);

  const refreshActiveTask = useCallback(async () => {
    try {
      await cleanUpIgniteTasksAction();
      const task = await getIgniteActiveTaskAction();
      setActiveTask(task);
    } catch (e) {
      console.error("Failed to refresh active ignite task", e);
    }
  }, []);

  // 初期ロード時にアクティブタスクの確認とクリーンアップ
  useEffect(() => {
    refreshActiveTask();
  }, [refreshActiveTask]);

  const drawGacha = useCallback(async () => {
    setIsDrawing(true);
    // ガチャ演出のために少しウェイトを置く（1.5秒程度）
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const task = await drawIgniteGachaAction();
      setActiveTask(task);
      return task;
    } catch (e) {
      console.error("Failed to draw gacha", e);
      return null;
    } finally {
      setIsDrawing(false);
    }
  }, []);

  return (
    <IgniteContext.Provider value={{
      isIgniteOpen,
      openIgnite,
      closeIgnite,
      activeTask,
      drawGacha,
      refreshActiveTask,
      isDrawing
    }}>
      {children}
    </IgniteContext.Provider>
  );
}

export function useIgnite() {
  const context = useContext(IgniteContext);
  if (context === undefined) {
    throw new Error("useIgnite must be used within an IgniteProvider");
  }
  return context;
}
