"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { DeleteAccountRow } from "@/components/profile/delete-account-row";
import { ChevronIcon, DownloadIcon } from "@/components/ui/icons";
import { SectionRule } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { exportMyData } from "@/lib/account-actions";
import { signOut } from "@/lib/auth/actions";

/* ===========================================================================
   AccountSection (G8, step 5) — the account block: the (static) email, a link
   into the auth flow for sign-in/security, the RGPD data export (decision 3:
   a read-only server action whose JSON the client downloads), and sign out.
   The "Delete my account" danger row + its modal are the step-7 security stop.
=========================================================================== */

const ROW =
  "border-structural flex w-full items-center justify-between gap-4 rounded-md bg-surface px-4 py-3 text-left text-foreground";

export function AccountSection({ email }: { email: string }) {
  const t = useTranslations("Profile.account");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError(false);
    try {
      const res = await exportMyData();
      if (res.status !== "done") {
        setError(true);
        return;
      }
      // Turn the read-only payload into a local download — no data leaves the
      // user's device beyond their own browser.
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stap-data-export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <SectionRule>{t("title")}</SectionRule>

      {/* Email — static, not interactive. */}
      <div className="border-structural flex flex-col gap-0.5 rounded-md bg-surface px-4 py-3">
        <span className="text-helper text-muted">{t("email")}</span>
        <span className="text-body font-medium break-all text-foreground">
          {email}
        </span>
      </div>

      {/* Change password — routes to the auth flow (Phase C). */}
      <Link href="/login" className={ROW}>
        <span className="text-body font-medium">{t("password")}</span>
        <ChevronIcon className="h-5 w-5 shrink-0 text-muted" />
      </Link>

      {/* Export my data — RGPD download. */}
      <button
        type="button"
        className={ROW}
        onClick={handleExport}
        disabled={exporting}
        aria-busy={exporting}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-body font-medium">{t("export")}</span>
          <span className="text-helper text-muted">
            {exporting ? t("exporting") : error ? t("exportError") : t("exportDesc")}
          </span>
        </span>
        <DownloadIcon className="h-5 w-5 shrink-0 text-muted" />
      </button>

      {/* Sign out — server action, clears the session and redirects to public. */}
      <form action={signOut}>
        <button type="submit" className={ROW}>
          <span className="text-body font-medium">{t("signOut")}</span>
        </button>
      </form>

      {/* Delete my account — destructive, confirm modal (step-7 security stop). */}
      <DeleteAccountRow />
    </section>
  );
}
