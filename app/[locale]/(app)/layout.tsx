import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { BottomNav } from "@/components/layout/bottom-nav";
import { getCurrentUser } from "@/lib/auth/user";
import { db } from "@/lib/db";

// Authenticated app shell. Holds the standing layout container and the bottom
// navigation (hidden in focus mode). Per-route headers (AppBar / TopBar) are
// rendered by each page and carry the skip-to-content link.
//
// Onboarding gate: middleware already guarantees a session here, but a user
// who signed in without finishing onboarding has no profile yet — send them
// to the flow until `onboardedAt` is stamped (completeOnboarding).
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: { onboardedAt: true },
    });
    if (!profile?.onboardedAt) {
      redirect(`/${locale}/onboarding`);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {children}
      <BottomNav />
    </div>
  );
}
