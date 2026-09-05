// GET /api/health — platform liveness + database readiness (Stage 1 monitoring).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const STAGE = "10 — Trust Network (verified-interaction graph, mutual attestations, k-anonymized shared signals, pan-African provider registry)";
const VERSION = "1.9.0";
const startedAt = Date.now();

export async function GET(_req: NextRequest) {
  let dbStatus: "up" | "down" = "down";
  try {
    await db.$queryRaw`SELECT 1`;
    dbStatus = "up";
  } catch {
    dbStatus = "down";
  }

  const healthy = dbStatus === "up";
  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      stage: STAGE,
      version: VERSION,
      db: dbStatus,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
