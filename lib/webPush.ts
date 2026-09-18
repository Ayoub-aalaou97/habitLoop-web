import { API_URL, getToken } from "@/lib/auth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerReminderServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const token = getToken();
  if (!token) throw new Error("You are not logged in.");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_URL}/api/push/vapid-public-key`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || "Could not load push keys.");
  }
  const data = (await res.json()) as { publicKey: string };
  return data.publicKey;
}

function subscriptionToJson(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh!,
      auth: json.keys!.auth!,
    },
    contentEncoding: "aes128gcm",
  };
}

/**
 * Register SW, subscribe to Web Push, and store the subscription on the API.
 * Required for reminders when the browser is minimized.
 */
export async function ensureWebPushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const registration = await registerReminderServiceWorker();
  if (!registration) return false;

  await navigator.serviceWorker.ready;

  const publicKey = await fetchVapidPublicKey();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const res = await fetch(`${API_URL}/api/push/subscribe`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(subscriptionToJson(subscription)),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || "Could not save push subscription.");
  }

  return true;
}

export async function removeWebPushSubscription(): Promise<void> {
  if (!pushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  try {
    await fetch(`${API_URL}/api/push/subscribe`, {
      method: "DELETE",
      headers: await authHeaders(),
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
  } catch {
    // best-effort server cleanup
  }

  await subscription.unsubscribe().catch(() => undefined);
}
