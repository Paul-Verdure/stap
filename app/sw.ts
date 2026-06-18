/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// The precache manifest is injected at build time by createSerwistRoute
// (esbuild `define` replaces self.__SW_MANIFEST).
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        // Served when a document navigation fails with no network.
        // Localized route; the SW uses the default locale (en). The page is
        // precached via additionalPrecacheEntries.
        url: "/en/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Web Push (G9) ---------------------------------------------------------
// The daily-reminder sender (lib/push-sender.ts) posts an encrypted JSON
// payload { title, body, url } to each subscription endpoint. Show it as a
// notification; clicking it focuses an open tab (or opens the deep link).

type PushPayload = { title?: string; body?: string; url?: string; tag?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Non-JSON payload — fall back to plain text as the body.
    data = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "Stap", {
      body: data.body ?? "",
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      tag: data.tag ?? "stap-reminder",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if one is open; otherwise open a new one.
      for (const client of windows) {
        await client.focus();
        await client.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
