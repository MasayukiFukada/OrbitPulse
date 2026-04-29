"use client";

import { useState } from "react";
import styles from "./FibonacciSelector.module.css";

const FIBONACCI_NUMBERS = [0, 1, 2, 3, 5, 8, 13, 21];

export default function FibonacciSelector({
  defaultValue = 0,
}: {
  defaultValue?: number;
}) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div className={styles.container}>
      <input type="hidden" name="storyPoints" value={selected} />
      <div className={styles.buttonGrid}>
        {FIBONACCI_NUMBERS.map((num) => (
          <button
            key={num}
            type="button"
            className={`${styles.button} ${selected === num ? styles.active : ""}`}
            onClick={() => setSelected(num)}
          >
            {num}
          </button>
        ))}
      </div>
      <p className={styles.hint}>
        {selected === 0 ? "見積もりなし" : `見積もり: ${selected} ポイント`}
      </p>
    </div>
  );
}
