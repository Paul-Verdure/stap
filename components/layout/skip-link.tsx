import { getTranslations } from "next-intl/server";

// Skip-to-content link (a11y contract: WCAG 2.4.1 bypass blocks). Rendered as
// the first child of the page banner (AppBar / TopBar) so it is both the first
// focusable element AND contained by a landmark (keeps axe's region rule
// happy). Visible only when focused; the focus ring is the one allowed shadow.
export async function SkipLink() {
  const t = await getTranslations("Nav");
  return (
    <a
      href="#main-content"
      className="sr-only rounded-md bg-foreground px-4 py-2 text-body text-background focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
    >
      {t("skip")}
    </a>
  );
}
