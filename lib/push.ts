/* ===========================================================================
   Web Push client helpers (G9) — browser subscribe / unsubscribe.
   ---------------------------------------------------------------------------
   The Notifications toggle drives these. Everything degrades gracefully: if
   the browser lacks push support, the VAPID public key is unset, or the user
   denies permission, the helpers return null and the toggle stays off. Client
   only ("use client" callers); the server side is lib/push-actions.ts.
=========================================================================== */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** True when this browser can subscribe to Web Push and we have a VAPID key. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    !!PUBLIC_KEY
  );
}

// VAPID public keys are base64url; the Push API wants an ArrayBuffer-backed
// view (BufferSource), so allocate the ArrayBuffer explicitly.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function toPayload(sub: PushSubscription): PushSubscriptionPayload | null {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  };
}

/**
 * Request permission (if needed) and subscribe this device to push. Returns
 * the subscription payload to persist, or null if unsupported / denied.
 * `requestPermission` must be called from a user gesture (the toggle).
 */
export async function subscribeToPush(): Promise<PushSubscriptionPayload | null> {
  if (!isPushSupported() || !PUBLIC_KEY) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
    }));

  return toPayload(subscription);
}

/**
 * Unsubscribe this device. Returns the removed endpoint (to delete its row),
 * or null if there was nothing to unsubscribe.
 */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}
