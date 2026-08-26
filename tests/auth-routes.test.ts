import { describe, expect, it } from "vitest";

import { APP_HOME, isPublic, routeFor } from "@/lib/auth/routes";

/* The bug these guard against: signing in landed the user back on the welcome
   screen — a public page whose only content is an "enter the app" button. The
   session was real, the app was one tap away, and that tap looked like the
   sign-in had not worked. The same dead end greeted every PWA launch, since
   the welcome screen is also the start_url.

   Paths here are what the proxy passes in: the locale prefix already
   stripped. */

const LOCALE = "fr";

describe("isPublic", () => {
  it("lets a logged-out visitor read the doors and the legal documents", () => {
    for (const p of [
      "/",
      "/login",
      "/onboarding",
      "/legal",
      "/legal/privacy",
      "/design-system",
      "/~offline",
    ]) {
      expect(isPublic(p)).toBe(true);
    }
  });

  it("keeps the app itself private", () => {
    for (const p of ["/today", "/today/prepare", "/journal", "/games", "/profile"]) {
      expect(isPublic(p)).toBe(false);
    }
  });

  it("matches whole segments, not prefixes", () => {
    // "/loginhack" is not below "/login".
    expect(isPublic("/loginhack")).toBe(false);
    expect(isPublic("/legalese")).toBe(false);
  });
});

describe("routeFor, signed out", () => {
  it("sends a private path to the localized login", () => {
    expect(routeFor(false, "/today", LOCALE)).toBe("/fr/login");
    expect(routeFor(false, "/journal/42", "en")).toBe("/en/login");
  });

  it("leaves the public pages alone", () => {
    expect(routeFor(false, "/", LOCALE)).toBeNull();
    expect(routeFor(false, "/login", LOCALE)).toBeNull();
    expect(routeFor(false, "/onboarding", LOCALE)).toBeNull();
  });
});

describe("routeFor, signed in", () => {
  it("carries the user through both doors into the app", () => {
    expect(routeFor(true, "/", LOCALE)).toBe(`/fr${APP_HOME}`);
    expect(routeFor(true, "/login", LOCALE)).toBe(`/fr${APP_HOME}`);
  });

  it("does not bounce a user who is already inside", () => {
    for (const p of [APP_HOME, "/today/validate", "/journal", "/profile"]) {
      expect(routeFor(true, p, LOCALE)).toBeNull();
    }
  });

  it("leaves onboarding to the (app) layout, which can read the profile", () => {
    expect(routeFor(true, "/onboarding", LOCALE)).toBeNull();
  });

  it("does not lock a signed-in user out of the public documents", () => {
    expect(routeFor(true, "/legal/privacy", LOCALE)).toBeNull();
  });
});
