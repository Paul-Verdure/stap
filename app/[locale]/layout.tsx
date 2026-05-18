import { SerwistProvider } from "@serwist/turbopack/react";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";

import "../globals.css";

// Two self-hosted variable fonts (one file each, no layout shift):
// Syne for headings/accents (font-display), Inter for body (font-sans).
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stap — Leer Nederlands",
  description: "Apprendre le néerlandais, pas à pas.",
};

// Statically render every known locale at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Next 16: route params are async and must be awaited.
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Opt into static rendering for this locale (must run before any
  // next-intl API call in the tree).
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${syne.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {/* Registers the service worker (served at /serwist/sw.js). */}
        <SerwistProvider swUrl="/serwist/sw.js">
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
