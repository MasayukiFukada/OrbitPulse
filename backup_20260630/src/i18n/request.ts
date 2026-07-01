import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import ja from "@/i18n/messages/ja.json";
import en from "@/i18n/messages/en.json";

const messages = {
  ja,
  en,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  console.log("★ request.ts: requestLocale =", requested);
  
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  console.log("★ request.ts: Using locale =", locale);

  return {
    locale,
    messages: messages[locale as keyof typeof messages],
  };
});
