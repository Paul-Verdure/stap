// Side-effect import: gives Node 20 a global WebSocket, for scripts only.
//
// Why this exists. `@supabase/supabase-js` builds a RealtimeClient eagerly
// inside createClient(), and RealtimeClient._initializeOptions resolves a
// WebSocket constructor even when no channel is ever subscribed. Node 20 has
// no global WebSocket (it landed unflagged in Node 22), so *constructing* the
// admin client throws before a single Supabase call is made:
//
//     Node.js 20 detected without native WebSocket support.
//
// The app never hit this: Next polyfills globalThis.WebSocket from its bundled
// `ws` in node-environment-baseline.js, so server actions using the admin
// client work in production. Standalone tsx scripts get no such treatment,
// which is why `pnpm db:sync-audio` had never actually been runnable on the
// Node 20 this project mandates.
//
// Why a global polyfill rather than a transport option on createAdminClient:
// realtime-js resolves the constructor from `globalThis.WebSocket` *before* it
// checks the Node version (see lib/websocket-factory.js, detectEnvironment),
// so assigning it here is enough. That keeps lib/supabase/admin.ts unchanged
// and shared with lib/account-actions.ts, and keeps `ws` a devDependency
// instead of dragging it into the Next server bundle for a code path the app
// does not need.
//
// Import this first, before anything that reaches createAdminClient(). Drop it
// once the project moves to Node 22+.
import WebSocket from "ws";

if (typeof globalThis.WebSocket === "undefined") {
  // `ws` is API-compatible enough for the constructor lookup. Nothing here
  // ever opens a realtime channel — this only has to be a defined class.
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}
