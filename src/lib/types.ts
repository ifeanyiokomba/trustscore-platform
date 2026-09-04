// TrustScore Stage 1 — shared client-side types (mirrors API contract in /api/v1/*)

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  handle: string;
  status: string;
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export interface ActivityEvent {
  id: string;
  action: string;
  createdAt: string;
  metadata?: string;
}

export interface HealthStatus {
  status: "ok" | "degraded";
  stage: string;
  version: string;
  db: "up" | "down";
  uptimeSec: number;
  time: string;
}
