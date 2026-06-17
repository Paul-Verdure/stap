import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import pkg from "@/package.json";

/* ===========================================================================
   LegalFooter (G8, step 8) — the profile's closing footer: the legal links,
   the app version, and the "made with ♥" line. Rendered inside <main>, so the
   <footer> is content (not a duplicate contentinfo landmark). The heart is an
   amber SHAPE (decorative, aria-hidden) with an sr-only word so the line still
   reads naturally.
=========================================================================== */

const LEGAL_DOCS = ["terms", "privacy", "notice"] as const;

export function LegalFooter() {
  const t = useTranslations("Profile.footer");

  return (
    <footer className="mt-4 flex flex-col items-center gap-3 border-t border-hairline pt-6 text-center">
      <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-helper">
        {LEGAL_DOCS.map((doc, i) => (
          <li key={doc} className="flex items-center gap-2">
            <Link
              href={`/legal/${doc}`}
              className="text-muted underline decoration-dashed underline-offset-4 hover:text-foreground"
            >
              {t(`links.${doc}`)}
            </Link>
            {i < LEGAL_DOCS.length - 1 ? (
              <span aria-hidden className="text-muted">
                ·
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-helper text-muted">
        {t("version", { version: pkg.version })}
      </p>

      <p className="text-helper text-muted">
        {t.rich("madeWith", {
          heart: () => (
            <>
              <span aria-hidden className="text-accent">
                ♥
              </span>
              <span className="sr-only">{t("heartAlt")}</span>
            </>
          ),
        })}
      </p>
    </footer>
  );
}
