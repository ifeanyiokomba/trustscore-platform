// TrustScore Stage 1 — NotificationService plumbing (Security Center UI arrives Stage 5).

import { db } from "@/lib/db";

export async function notifyUser(
  userId: string,
  type: "SECURITY" | "VERIFICATION" | "SYSTEM",
  title: string,
  body: string
): Promise<void> {
  try {
    await db.notification.create({ data: { userId, type, title, body } });
  } catch (err) {
    console.error("[notification] failed:", (err as Error).message);
  }
}

export function welcomeNotification(displayName: string) {
  const first = displayName.split(" ")[0] || "there";
  return {
    title: "Welcome to TrustScore",
    body: `Welcome, ${first}. Your account is ready and your @handle is reserved. Identity verification through NINAuth arrives in Stage 2 — we'll notify you here.`,
  };
}
