/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  RangeRequestsPlugin,
  Serwist,
} from "serwist";

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
  runtimeCaching: [
    {
      // Cache page navigations so the last-seen screens — notably today's
      // challenge — render offline. NetworkFirst keeps them fresh online and
      // falls back to the cached copy when the network is gone; the document
      // fallback below only shows ~offline when nothing is cached yet.
      matcher({ request }) {
        return request.mode === "navigate";
      },
      handler: new NetworkFirst({
        cacheName: "stap-pages",
        networkTimeoutSeconds: 3,
      }),
    },
    {
      // Catalog phrase audio, served cross-origin from Supabase Storage.
      // serwist's defaultCache only covers same-origin Next assets, so
      // without this rule the clips are re-fetched on every play and are
      // simply unavailable offline — which would undercut the point of
      // caching today's challenge pages at all.
      //
      // Matched on pathname rather than the Supabase origin: the bucket
      // segment is already a stable literal in lib/storage/phrase-audio.ts,
      // and NEXT_PUBLIC_SUPABASE_URL is not reliably inlined into the
      // esbuild-bundled worker. Moving the bucket behind a CDN later keeps
      // working as long as the path shape survives, which is the same
      // assumption phraseAudioUrl() already makes.
      matcher({ url }) {
        return url.pathname.includes(
          "/storage/v1/object/public/phrase-audio/",
        );
      },
      handler: new CacheFirst({
        cacheName: "stap-phrase-audio",
        plugins: [
          // A clip is addressed by slug and effectively immutable, so a hit
          // should never go to the network. db:sync-audio uploads with
          // upsert, so a replaced clip is possible — the 30-day ceiling is
          // what bounds how long a stale one can linger.
          new ExpirationPlugin({
            maxEntries: 250, // 226 phrases, with headroom for the catalog to grow.
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
          // 200 only — never 0. An opaque response (status 0) is exactly what
          // poisons this cache: its body cannot be read from script, so
          // RangeRequestsPlugin has nothing to slice and WebKit is handed an
          // empty result. Audio is fetched in CORS mode (see AudioButton), so
          // a genuine 200 is what arrives; anything opaque means something is
          // wrong and is better refetched than stored.
          //
          // 206 is absent on purpose too: a partial response is a fragment,
          // not the file. AudioButton warms this cache with a full request.
          new CacheableResponsePlugin({ statuses: [200] }),
          // Safari requests media with a Range header. Without this, a range
          // request against a fully-cached clip fails instead of being served
          // from the stored response.
          new RangeRequestsPlugin(),
        ],
      }),
    },
    ...defaultCache,
  ],
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
