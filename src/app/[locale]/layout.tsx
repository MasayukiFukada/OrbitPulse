import Link from "next/link";
import Image from "next/image";
import styles from "@/presentation/styles/layout.module.css";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isValidLocale, type Locale } from "@/i18n/settings";
import ja from "@/i18n/messages/ja.json";
import en from "@/i18n/messages/en.json";

const messagesMap = {
  ja,
  en,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;

  // ロケールの検証
  let locale: Locale = "ja";
  if (isValidLocale(rawLocale)) {
    locale = rawLocale;
  }

  // サーバーサイドのリクエストコンテクストにロケールを設定
  setRequestLocale(locale);

  const messages = messagesMap[locale];
  const t = await getTranslations("common");

  console.log("Layout: locale =", locale, ", backlog translation =", t("backlog"));

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <Link href="/" className={styles.logo}>
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
          <nav className={styles.nav}>
            <Link href={`/${locale}/backlog`} className={styles.navLink}>
              {t("backlog")}
            </Link>
            <Link href={`/${locale}/sprints`} className={styles.navLink}>
              {t("sprints")}
            </Link>
          </nav>
          <LanguageSwitcher currentLocale={locale} />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
