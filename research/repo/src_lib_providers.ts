import type { Evidence, ProviderResult, VerificationKind } from "@/lib/types";
import { PROVIDER_INFO } from "@/lib/types";

// ---------------------------------------------------------------------------
// Mock provider sandbox.
//
// CRITICAL: These are NOT live government or bank integrations. Every result is
// simulated to exercise provider-resilience paths (verified / failed / error /
// timeout / partial / low_confidence). No real PII is ever queried.
//
// Determinism: results are derived from a stable hash of the input so the same
// account/phone yields the same outcome across calls — except for a curated set
// of "known" demo subjects that illustrate each edge case.
// ---------------------------------------------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SANDBOX_BANKS: Record<string, string> = {
  "000001": "GTBank",
  "000002": "Access Bank",
  "000004": "Zenith Bank",
  "000007": "UBA",
  "000008": "First Bank",
  "000013": "Sterling Bank",
  "000014": "FCMB",
  "000016": "Wema Bank",
  "000017": "Polaris Bank",
  "000020": "Union Bank",
  "011": "Kuda Microfinance Bank",
  "035": "Wema Bank",
  "057": "Polaris Bank",
  "058": "Stanbic IBTC",
  "076": "Guaranty Trust Bank (MFB)",
  "999": "Mock Sandbox Bank",
};

export function bankName(code: string): string {
  return SANDBOX_BANKS[code] ?? "Unknown Institution";
}

export function maskAccountNumber(acc: string): string {
  if (acc.length <= 4) return "****";
  return "****" + acc.slice(-4);
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return "+234 *** *** " + phone.slice(-4);
}

export function maskNin(nin: string): string {
  if (nin.length <= 4) return "******";
  return "******" + nin.slice(-4);
}

// Demo subjects — illustrate the spectrum of outcomes.
const KNOWN_NEGATIVE_ACCOUNTS = new Set([
  "0123456789", // active fraud flag
  "9999999999", // account name mismatch
]);
const KNOWN_TIMEOUT_ACCOUNTS = new Set(["0000000000"]);
const KNOWN_INACTIVE_PHONES = new Set(["08000000000", "07000000001"]);
const KNOWN_LOW_CONF_PHONES = new Set(["08111111111"]);

function latencyFor(provider: string, base: number): number {
  const jitter = (hashString(provider) % 90);
  return base + jitter;
}

// --- Phone verification (Dojah/Youverify-style sandbox) -------------------
export function verifyPhone(phone: string, provider = "DOJAH"): ProviderResult {
  const p = normalizePhone(phone);
  if (KNOWN_INACTIVE_PHONES.has(p)) {
    return {
      status: "FAILED",
      confidence: 0.92,
      provider: provider as ProviderResult["provider"],
      latencyMs: latencyFor(provider, 180),
      evidence: [
        {
          kind: "PHONE_INACTIVE",
          value: "Number not in active range / disconnected",
          confidence: 0.92,
          provider,
          observedAt: new Date().toISOString(),
        },
      ],
    };
  }
  const lowConf = KNOWN_LOW_CONF_PHONES.has(p);
  const carrier =
    p.startsWith("0803") || p.startsWith("0806") || p.startsWith("0703") || p.startsWith("0813")
      ? "MTN"
      : p.startsWith("0802") || p.startsWith("0808") || p.startsWith("0708")
      ? "Airtel"
      : p.startsWith("0805") || p.startsWith("0807") || p.startsWith("0815")
      ? "Glo Mobile"
      : p.startsWith("0809") || p.startsWith("0817")
      ? "9mobile"
      : "Unknown";

  return {
    status: lowConf ? "LOW_CONFIDENCE" : "VERIFIED",
    confidence: lowConf ? 0.55 : 0.9,
    provider: provider as ProviderResult["provider"],
    latencyMs: latencyFor(provider, 220),
    evidence: [
      {
        kind: "PHONE_ACTIVE",
        value: lowConf ? "Possibly active (low confidence)" : `Active on ${carrier}`,
        confidence: lowConf ? 0.55 : 0.9,
        provider,
        observedAt: new Date().toISOString(),
      },
    ],
    raw: { carrier, normalized: p },
  };
}

// --- Account verification (NIBSS-style sandbox) -----------------------------
export function verifyAccount(
  bankCode: string,
  accountNumber: string,
  provider = "NIBSS"
): ProviderResult {
  const acc = accountNumber.replace(/\s/g, "");
  if (KNOWN_TIMEOUT_ACCOUNTS.has(acc)) {
    return {
      status: "TIMEOUT",
      confidence: 0,
      provider: provider as ProviderResult["provider"],
      latencyMs: latencyFor(provider, 8000),
      evidence: [],
      raw: { note: "Provider timed out — should trigger fallback routing." },
    };
  }
  if (KNOWN_NEGATIVE_ACCOUNTS.has(acc)) {
    if (acc === "9999999999") {
      return {
        status: "FAILED",
        confidence: 0.88,
        provider: provider as ProviderResult["provider"],
        latencyMs: latencyFor(provider, 300),
        evidence: [
          {
            kind: "ACCOUNT_NAME_MISMATCH",
            value: "Provided name does not match account holder name",
            confidence: 0.88,
            provider,
            observedAt: new Date().toISOString(),
          },
        ],
      };
    }
    // active fraud flag account — still "verifies" the name, but flagged downstream
    return {
      status: "VERIFIED",
      confidence: 0.95,
      provider: provider as ProviderResult["provider"],
      latencyMs: latencyFor(provider, 320),
      evidence: [
        {
          kind: "ACCOUNT_NAME_VERIFIED",
          value: `${bankName(bankCode)} account name matched`,
          confidence: 0.95,
          provider,
          observedAt: new Date().toISOString(),
        },
      ],
      raw: { name: "ADENIJI OLUWASEUN", sandboxFlag: "DEMO_FRAUD" },
    };
  }
  // generic deterministic positive
  const h = hashString(acc + bankCode);
  const confidence = 0.85 + ((h % 14) / 100); // 0.85..0.98
  return {
    status: "VERIFIED",
    confidence,
    provider: provider as ProviderResult["provider"],
    latencyMs: latencyFor(provider, 260),
    evidence: [
      {
        kind: "ACCOUNT_NAME_VERIFIED",
        value: `${bankName(bankCode)} account name matched`,
        confidence,
        provider,
        observedAt: new Date().toISOString(),
      },
    ],
    raw: { name: "OKAFOR CHIEMEKA B" },
  };
}

// --- Identity verification (NIMC-style sandbox) ----------------------------
export function verifyIdentity(
  nin: string,
  provider = "NIMC"
): ProviderResult {
  const n = nin.replace(/\s/g, "");
  if (n.length < 11) {
    return {
      status: "FAILED",
      confidence: 0.7,
      provider: provider as ProviderResult["provider"],
      latencyMs: latencyFor(provider, 120),
      evidence: [
        {
          kind: "IDENTITY_VERIFIED",
          value: "Invalid identity reference length",
          confidence: 0.0,
          provider,
          observedAt: new Date().toISOString(),
        },
      ],
    };
  }
  const h = hashString(n);
  const confidence = 0.9 + ((h % 9) / 100);
  return {
    status: "VERIFIED",
    confidence,
    provider: provider as ProviderResult["provider"],
    latencyMs: latencyFor(provider, 410),
    evidence: [
      {
        kind: "NIN_VERIFIED",
        value: "Identity reference validated by NIMC sandbox",
        confidence,
        provider,
        observedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      },
    ],
    raw: { firstName: "T***", lastName: "A***", masked: maskNin(n) },
  };
}

// --- Face match (Smile ID-style sandbox) -----------------------------------
export function verifyFace(seed = "selfie-1", provider = "SMILE_ID"): ProviderResult {
  const h = hashString(seed);
  const confidence = 0.7 + ((h % 30) / 100);
  const matched = confidence >= 0.75;
  return {
    status: matched ? "VERIFIED" : "LOW_CONFIDENCE",
    confidence,
    provider: provider as ProviderResult["provider"],
    latencyMs: latencyFor(provider, 1400),
    evidence: [
      matched
        ? {
            kind: "FACE_MATCH",
            value: "Biometric similarity above threshold",
            confidence,
            provider,
            observedAt: new Date().toISOString(),
          }
        : {
            kind: "FACE_MISMATCH",
            value: "Biometric similarity below threshold",
            confidence: 1 - confidence,
            provider,
            observedAt: new Date().toISOString(),
          },
    ],
    raw: { similarity: Math.round(confidence * 100) / 100 },
  };
}

// --- Provider router: PRIMARY → SECONDARY → FALLBACK -----------------------
export interface RouterInput {
  kind: VerificationKind;
  phone?: string;
  bankCode?: string;
  accountNumber?: string;
  nin?: string;
  faceSeed?: string;
}

export function routeProvider(
  input: RouterInput,
  primary: string
): ProviderResult {
  const chain: string[] = [primary, "DOJAH", "MOCK"];
  for (const p of chain) {
    let res: ProviderResult | null = null;
    if (input.kind === "PHONE" && input.phone) res = verifyPhone(input.phone, p);
    if (input.kind === "ACCOUNT" && input.bankCode && input.accountNumber)
      res = verifyAccount(input.bankCode, input.accountNumber, p);
    if (input.kind === "IDENTITY" && input.nin) res = verifyIdentity(input.nin, p);
    if (input.kind === "FACE") res = verifyFace(input.faceSeed ?? "selfie-1", p);
    if (!res) continue;
    // retry on timeout / provider_error
    if (res.status === "TIMEOUT" || res.status === "PROVIDER_ERROR") continue;
    return res;
  }
  // exhausted — return a final UNKNOWN state
  return {
    status: "PROVIDER_ERROR",
    confidence: 0,
    provider: "MOCK",
    latencyMs: 0,
    evidence: [
      {
        kind: "INSUFFICIENT_EVIDENCE",
        value: "All providers in routing chain failed",
        confidence: 0,
        provider: "MOCK",
        observedAt: new Date().toISOString(),
      },
    ],
  };
}

function normalizePhone(p: string): string {
  let s = p.replace(/\D/g, "");
  if (s.startsWith("234")) s = "0" + s.slice(3);
  if (s.length === 10 && !s.startsWith("0")) s = "0" + s;
  return s;
}

export { PROVIDER_INFO };
