// TrustScore Stage 1 — session management (server side).
// The raw session token lives ONLY in an httpOnly cookie; the database stores
// its sha256 hash. Revocation = row update; expiry enforced on read.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSessionToken, sha256Hex, hashIp } from "@/lib/platform/crypto";

export const SESSION_COOKIE = "ts_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  status: string;
  role: string; // USER | REVIEWER (Stage 7 — operational grant)
  createdAt: Date;
}

export function toPublicUser(u: SessionUser) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    handle: u.handle,
    status: u.status,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function createSession(
  userId: string,
  req: NextRequest
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256Hex(token),
      expiresAt,
      userAgent: (req.headers.get("user-agent") ?? "unknown").slice(0, 200),
      ipHash: hashIp(
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip")
      ),
    },
  });
  return { token, expiresAt };
}

export function setSessionCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date
): NextResponse {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function getSessionUser(
  req: NextRequest
): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256Hex(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt || session.expiresAt.getTime() < Date.now()) return null;
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
}

export async function revokeSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const result = await db.session.updateMany({
    where: { tokenHash: sha256Hex(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}
