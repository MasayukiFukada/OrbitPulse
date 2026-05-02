import { redirect } from "next/navigation";

export default function RootPage() {
  // デフォルト言語（日本語）にリダイレクト
  redirect("/ja");
}
