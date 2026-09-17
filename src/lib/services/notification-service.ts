// TrustScore Stage 1 — NotificationService plumbing (Security Center UI arrives Stage 5).
// Stage 12: SCORE type — material score-change receipts (see trustscore-service
// maybeNotifyScoreDrop; every receipt points at Score Insights, never a verdict).

import { db } from "@/lib/db";

export type NotificationType = "SECURITY" | "VERIFICATION" | "SYSTEM" | "SCORE";

export async function notifyUser(
  userId: string,
  type: NotificationType,
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
