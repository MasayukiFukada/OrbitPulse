import Navigation from "./components/Navigation";
import styles from "@/presentation/styles/layout.module.css";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isValidLocale, type Locale } from "@/i18n/settings";
import ja from "@/i18n/messages/ja.json";
import en from "@/i18n/messages/en.json";
import { GlobalProviders } from "./components/GlobalProviders";
import PomodoroStatusDisplay from "./sprints/[id]/PomodoroStatusDisplay";

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
  const tIgnite = await getTranslations("igniteSettings");

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <GlobalProviders>
        <div className={styles.container}>
          <Navigation 
            locale={locale} 
            translations={{
              backlog: t("backlog"),
              sprints: t("sprints"),
              tasksSettings: t("tasksSettings"),
              recurringSettings: t("recurringSettings"),
              igniteSettings: tIgnite("title")
            }} 
          />
          <main className={styles.main}>
            <PomodoroStatusDisplay />
            <div className={styles.contentWrapper}>
              {children}
            </div>
          </main>
        </div>
      </GlobalProviders>
    </NextIntlClientProvider>
  );
}
