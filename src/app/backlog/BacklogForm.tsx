"use client";

import { BacklogItem } from "@/domain/entities/BacklogItem";
import { addBacklogItemAction, updateBacklogItemAction } from "./actions";
import FibonacciSelector from "./FibonacciSelector";
import styles from "./page.module.css";
import { useEffect, useRef } from "react";

interface BacklogFormProps {
  editItem?: BacklogItem | null;
  onCancel?: () => void;
}

export default function BacklogForm({ editItem, onCancel }: BacklogFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!editItem) {
      formRef.current?.reset();
    }
  }, [editItem]);

  const action = editItem 
    ? updateBacklogItemAction.bind(null, editItem.id)
    : addBacklogItemAction;

  return (
    <form 
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        if (!editItem) {
          formRef.current?.reset();
        }
        if (onCancel) onCancel();
      }} 
      className={styles.form}
    >
      <h2 className={styles.formTitle}>
        {editItem ? "アイテムを編集" : "新しいバックログを追加"}
      </h2>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Who(誰が)</label>
        <input 
          name="subject" 
          className={styles.input} 
          placeholder="私" 
          defaultValue={editItem?.subject || "私"}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>What(何をしたいか)</label>
        <input 
          name="title" 
          required 
          className={styles.input} 
          placeholder="何を作る？" 
          defaultValue={editItem?.title}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={`${styles.label} ${styles.labelWhy}`}>Why (なぜならば)</label>
        <textarea 
          name="why" 
          required 
          className={`${styles.textarea} ${styles.textareaWhy}`} 
          placeholder="モチベーションの源泉をここに！"
          defaultValue={editItem?.why}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Description(詳細説明)</label>
        <textarea 
          name="description" 
          className={styles.textarea} 
          placeholder="具体的な内容は？" 
          defaultValue={editItem?.description || ""}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>Condition(受け入れ条件。これができたら完了)</label>
        <textarea 
          name="acceptanceCriteria" 
          className={styles.textarea} 
          placeholder="・〇〇ができること&#10;・××が表示されること" 
          defaultValue={editItem?.acceptanceCriteria || ""}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>見積もり (パルス数)</label>
        <FibonacciSelector key={editItem?.id || "new"} defaultValue={editItem?.storyPoints} />
      </div>

      <div className={styles.buttonGroup}>
        <button type="submit" className={styles.button}>
          {editItem ? "更新する" : "バックログに追加"}
        </button>
        {editItem && (
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
