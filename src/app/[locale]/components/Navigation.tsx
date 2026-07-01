"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/presentation/styles/layout.module.css";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { Locale } from "@/i18n/settings";
import Image from "next/image";
import { useIgnite } from "./IgniteContext";

interface NavigationProps {
  locale: Locale;
  translations: {
    backlog: string;
    sprints: string;
    tasksSettings: string;
    recurringSettings: string;
    igniteSettings: string;
  };
}

export default function Navigation({ locale, translations }: NavigationProps) {
  const pathname = usePathname();
  const { openIgnite } = useIgnite();

  const isActive = (path: string) => {
    return pathname.startsWith(`/${locale}${path}`) ? styles.activeNavLink : "";
  };

  return (
    <aside className={styles.sidebar}>
      <Link href={`/${locale}`} className={styles.logo}>
        <Image
          src="/images/OrbitPulse_Logo.png"
          alt="OrbitPulse Logo"
          width={40}
          height={40}
          priority
        />
        <span className={styles.logoText}>
          <span style={{ color: "#ffffff" }}>Orbit</span>
          <span style={{ color: "#16ADB4" }}>Pulse</span>
        </span>
      </Link>
      <button className={styles.igniteBtn} onClick={openIgnite}>
        🍅 Ignite!
      </button>
      <nav className={styles.nav}>
        <Link 
          href={`/${locale}/backlog`} 
          className={`${styles.navLink} ${isActive("/backlog")}`}
        >
          {translations.backlog}
        </Link>
        <Link 
          href={`/${locale}/sprints`} 
          className={`${styles.navLink} ${isActive("/sprints")}`}
        >
          {translations.sprints}
        </Link>
        <Link 
          href={`/${locale}/tasks`} 
          className={`${styles.navLink} ${isActive("/tasks")}`}
        >
          {translations.tasksSettings}
        </Link>
        <Link 
          href={`/${locale}/recurring`} 
          className={`${styles.navLink} ${isActive("/recurring")}`}
        >
          {translations.recurringSettings}
        </Link>
        <Link 
          href={`/${locale}/ignite/tasks`} 
          className={`${styles.navLink} ${isActive("/ignite/tasks")}`}
        >
          {translations.igniteSettings}
        </Link>
      </nav>
      <div style={{ marginTop: "auto" }}>
        <LanguageSwitcher currentLocale={locale} />
      </div>
    </aside>
  );
}
