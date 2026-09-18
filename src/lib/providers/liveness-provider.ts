// TrustScore Stage 4 — Biometric liveness provider adapter
// (CONTRACT-FIRST, MOCK transport — Smile-ID-class job contract).
//
// The contract a real liveness/biometric partner exposes:
//   create job → capture (client-side SDK) → submit → verdict
//   { passed, livenessScore, faceMatchScore, consistent, reason, confidence }
//
// In this sandbox the capture is simulated (the frontend renders an honest
// MOCK capture experience) and the verdict is computed here deterministically.
// The LIVE implementation swaps only the job submission + polling transport;
// the verdict shape, thresholds, identifier/evidence discipline and consent
// binding stay identical.
//
// Security invariants (directive §32/§29):
//   - No selfie pixels, face templates or biometric data are EVER stored.
//     Only the redacted verdict + a fingerprint of the subject linkage.
//   - The biometric subject is matched against the government-anchored
//     identity reference (masked NINAuth subject) — never a raw NIN.

import { createHash, randomBytes } from "crypto";
import { guardedSecret } from "@/lib/platform/boot-guard";

export const LIVENESS_PROVIDER_NAME = "LIVENESS_MOCK";
export const LIVENESS_MODE: "MOCK" | "LIVE" = "MOCK"; // honestly labeled everywhere

// sec-batch-A: guarded read — production refuses to boot on the dev default.
const LIVENESS_PEPPER = guardedSecret("SIGNAL_PEPPER");

export const LIVENESS_TTL_MS = 10 * 60_000; // capture-window TTL
export const LIVENESS_FRESHNESS_DAYS = 90; // identifier freshness horizon

// Verdict thresholds (contract constants — tunable policy, not magic numbers).
export const LIVENESS_PASS_THRESHOLD = 70; // anti-spoofing score floor
export const FACE_MATCH_THRESHOLD = 80; // selfie ↔ government record floor

// Test knobs for the MOCK transport (LIVE ignores them). These exist so the
// failure paths of the contract can be exercised end-to-end in the sandbox.
export type LivenessSimulate = "ok" | "fail_liveness" | "face_mismatch";

// ---------------------------------------------------------------------------
// Job contract — a real partner returns { jobId, uploadUrl/sdkToken }; the
// client captures and submits, then the backend polls or receives a webhook.
// MOCK: the job is created locally and "submitted" by the complete endpoint.
// ---------------------------------------------------------------------------

export function createLivenessJob(): { jobId: string } {
  return { jobId: `livejob_${randomBytes(16).toString("hex")}` };
}

// ---------------------------------------------------------------------------
// Subject linkage fingerprint: binds the liveness result to the
// government-anchored identity (masked NINAuth subject) — never a template.
// ---------------------------------------------------------------------------

export function biometricFingerprint(maskedSubject: string): string {
  return createHash("sha256")
    .update(`${LIVENESS_PEPPER}:biometric:${maskedSubject}`)
    .digest("hex");
}

// ---------------------------------------------------------------------------
// Verdict evaluation (MOCK): deterministic seeded scores per job, with
// explicit failure simulation for the test matrix.
// ---------------------------------------------------------------------------

export interface LivenessVerdict {
  passed: boolean;
  livenessScore: number; // 0–100 anti-spoofing score
  faceMatchScore: number; // 0–100 selfie ↔ government-record match
  consistent: boolean; // same person as the government record
  reason: string; // machine reason code (redacted — no PII)
  confidence: number; // 0–100 provider confidence
}

function seededRange(seed: string, min: number, max: number): number {
  const h = createHash("sha256").update(`${LIVENESS_PEPPER}:seed:${seed}`).digest();
  const v = h.readUInt32BE(0) % 1000;
  return min + Math.round((v / 999) * (max - min));
}

export function evaluateLiveness(input: {
  jobId: string;
  maskedSubject: string;
  simulate?: LivenessSimulate;
}): LivenessVerdict {
  let livenessScore: number;
  let faceMatchScore: number;
  let reason = "liveness_passed";

  switch (input.simulate) {
    case "fail_liveness":
      livenessScore = seededRange(`${input.jobId}:live-fail`, 20, 55);
      faceMatchScore = seededRange(`${input.jobId}:face-ok`, 82, 99);
      reason = "liveness_score_below_threshold";
      break;
    case "face_mismatch":
      livenessScore = seededRange(`${input.jobId}:live-ok`, 78, 99);
      faceMatchScore = seededRange(`${input.jobId}:face-fail`, 35, 65);
      reason = "face_match_below_threshold";
      break;
    default:
      livenessScore = seededRange(`${input.jobId}:live`, 80, 99);
      faceMatchScore = seededRange(`${input.jobId}:face`, 84, 99);
  }

  const passed =
    livenessScore >= LIVENESS_PASS_THRESHOLD && faceMatchScore >= FACE_MATCH_THRESHOLD;
  const consistent = passed && input.maskedSubject.length > 0;
  const confidence = Math.round((livenessScore + faceMatchScore) / 2);

  return {
    passed,
    livenessScore,
    faceMatchScore,
    consistent,
    reason,
    confidence: passed ? confidence : Math.round(Math.max(livenessScore, faceMatchScore) * 0.6),
  };
}

// Capture instructions contract — what the partner SDK displays.
export function captureInstructions(): string[] {
  return [
    "Hold the phone at eye level in good, even lighting",
    "Center your face in the frame and hold still",
    "Remove glasses, hats or masks that obscure your face",
    "The check takes a few seconds — keep the frame until it completes",
  ];
}
