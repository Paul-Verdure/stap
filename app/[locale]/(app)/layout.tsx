import { setRequestLocale } from "next-intl/server";

import { BottomNav } from "@/components/layout/bottom-nav";

// Authenticated app shell. Holds the standing layout container and the bottom
// navigation (hidden in focus mode). Per-route headers (AppBar / TopBar) are
// rendered by each page and carry the skip-to-content link as their first
// focusable child (a11y contract).
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {children}
      <BottomNav />
    </div>
  );
}
