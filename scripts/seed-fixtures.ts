// scripts/seed-fixtures.ts — re-seed the documented sandbox test accounts.
//
// The sandbox harness re-provisions the SQLite file on machine reboot
// (happened 2026-09-18 21:49: schema survives, DATA does not). The stage
// matrices assume the base fixture accounts pre-exist; this script recreates
// them through the REAL registration API so every discipline (scrypt hashing,
// AuthIdentifier rows, audit events, notifications) is identical to a live
// signup. Idempotent: existing accounts are login-verified, not duplicated.
//
// Usage: bun run seed:fixtures
//   fixtures: ada@example.com / SuperSecret1 (EMAIL verified — documented state)
//             chidi@example.com / TrustMe123!

const BASE = "http://127.0.0.1:3000";

interface Fixture {
  displayName: string;
  handle: string;
  email: string;
  password: string;
  verifyEmail?: boolean;
}

const FIXTURES: Fixture[] = [
  {
    displayName: "Ada Obi",
    handle: "ada",
    email: "ada@example.com",
    password: "SuperSecret1",
    verifyEmail: true,
  },
  {
    displayName: "Chidi Eze",
    handle: "chidi",
    email: "chidi@example.com",
    password: "TrustMe123!",
  },
];

async function call(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string
): Promise<{ status: number; json: any; setCookie: string | null }> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return {
    status: res.status,
    json,
    setCookie: res.headers.get("set-cookie"),
  };
}

async function main() {
  for (const fx of FIXTURES) {
    const reg = await call("/api/v1/auth/register", "POST", {
      displayName: fx.displayName,
      handle: fx.handle,
      password: fx.password,
      email: fx.email,
      acceptTerms: true,
    });
    if (reg.status === 201) {
      console.log(`✓ registered ${fx.email} (handle @${fx.handle})`);
    } else if (reg.status === 409) {
      console.log(`• ${fx.email} already exists (${reg.json?.error?.code ?? "conflict"}) — verifying login`);
    } else {
      console.error(`✗ registering ${fx.email} failed: ${reg.status} ${JSON.stringify(reg.json).slice(0, 200)}`);
      process.exit(1);
    }

    // Login check (also harvests the session cookie for email verification).
    const login = await call("/api/v1/auth/login", "POST", {
      identifier: fx.email,
      password: fx.password,
    });
    if (login.status !== 200) {
      console.error(`✗ login check failed for ${fx.email}: ${login.status}`);
      process.exit(1);
    }
    console.log(`✓ login works: ${fx.email}`);

    if (fx.verifyEmail && login.setCookie) {
      const cookie = login.setCookie.split(";")[0];
      const already = await call("/api/v1/auth/identifiers", "GET", undefined, cookie);
      const emailId = already.json?.identifiers?.find?.((i: any) => i.type === "EMAIL");
      if (emailId?.verified) {
        console.log(`• ${fx.email} EMAIL already verified`);
      } else {
        const req = await call("/api/v1/auth/email/verify/request", "POST", {}, cookie);
        const code = req.json?.mockCode;
        if (req.status === 200 && code) {
          const confirm = await call("/api/v1/auth/email/verify/confirm", "POST", { code }, cookie);
          console.log(
            confirm.status === 200
              ? `✓ ${fx.email} EMAIL verified`
              : `✗ email verification failed: ${confirm.status}`
          );
        } else {
          console.log(`• email verification request: ${req.status} (skipped)`);
        }
      }
    }
  }
  console.log("seed complete");
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
