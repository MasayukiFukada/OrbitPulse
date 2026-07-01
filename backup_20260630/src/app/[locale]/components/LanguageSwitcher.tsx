"use client";

import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames } from "@/i18n/settings";
import styles from "@/presentation/styles/layout.module.css";

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({
  currentLocale,
}: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: string) => {
    // 現在のパスから言語部分を取得
    const segments = pathname.split("/");
    // segments[1] が現在の言語
    segments[1] = newLocale;
    const newPathname = segments.join("/");
    router.push(newPathname);
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
      className={styles.languageSwitcher}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
