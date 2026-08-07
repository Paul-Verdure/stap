"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Helper } from "@/components/ui/typography";

// Farewell note shown when the login screen is reached from a completed
// account deletion (`?deleted=1`, set by deleteAccount). Without it the user
// lands on a bare sign-in form with no confirmation that anything happened.
//
// Reading the query string client-side keeps the login page prerendered: a
// `searchParams` prop would make the whole route dynamic, and this is a
// public, static surface. The caller wraps it in <Suspense> so the rest of
// the page still ships as static HTML.
export function DeletedNotice() {
  const t = useTranslations("Login.deleted");
  const searchParams = useSearchParams();

  if (searchParams.get("deleted") !== "1") return null;

  return (
    <div
      role="status"
      className="border-structural flex flex-col gap-2 rounded-md border-l-2 border-l-accent bg-surface p-4"
    >
      <p className="font-display text-greeting">{t("title")}</p>
      <Helper>{t("body")}</Helper>
    </div>
  );
}
