import { db } from "@/lib/db";
import { DEFAULT_POLICY } from "@/lib/trust-engine";
import { generateApiKey } from "@/lib/platform";

// Seed deterministic demo data so the UI is immediately meaningful.
// All providers are MOCK — clearly labeled.

async function main() {
  console.log("Seeding TrustScore demo data…");

  // 1) Active trust policy
  await db.trustPolicy.deleteMany({});
  await db.trustPolicy.create({
    data: {
      version: DEFAULT_POLICY.version,
      weights: JSON.stringify(DEFAULT_POLICY.weights),
      bands: JSON.stringify(DEFAULT_POLICY.bands),
      active: true,
    },
  });
  console.log("  ✓ trust policy", DEFAULT_POLICY.version);

  // 2) Persons (demo subjects with rich, contrasting profiles)
  const persons = [
    {
      handle: "chioma",
      displayName: "Chioma Okafor",
      avatarColor: "emerald",
      bio: "Verified freelancer · Lagos",
    },
    {
      handle: "tunde",
      displayName: "Tunde Adeniji",
      avatarColor: "amber",
      bio: "Subject of an active dispute — under review",
    },
    {
      handle: "amaka",
      displayName: "Amaka Eze",
      avatarColor: "teal",
      bio: "SME owner · verified identity + account",
    },
    {
      handle: "bola",
      displayName: "Bola Adeyemi",
      avatarColor: "slate",
      bio: "New member — insufficient evidence",
    },
  ];
  for (const p of persons) {
    await db.person.upsert({
      where: { handle: p.handle },
      create: p,
      update: { bio: p.bio },
    });
  }
  console.log("  ✓ persons:", persons.map((p) => p.handle).join(", "));

  // 3) Phones
  const phones = [
    { numberE164: "08031234567", displayNumber: "+234 *** *** 4567", carrier: "MTN", status: "ACTIVE" },
    { numberE164: "08057654321", displayNumber: "+234 *** *** 4321", carrier: "Glo Mobile", status: "ACTIVE" },
    { numberE164: "07031112233", displayNumber: "+234 *** *** 2233", carrier: "MTN", status: "ACTIVE" },
    { numberE164: "08000000000", displayNumber: "+234 *** *** 0000", carrier: "Unknown", status: "INACTIVE" },
  ];
  for (const ph of phones) {
    await db.phone.upsert({
      where: { numberE164: ph.numberE164 },
      create: ph,
      update: {},
    });
  }
  console.log("  ✓ phones:", phones.length);

  // 4) Bank accounts (demo)
  const accounts = [
    {
      bankCode: "000013",
      bankName: "Sterling Bank",
      accountNumber: "0123456789",
      maskedNumber: "****5678",
      accountNameMatch: "MATCH",
      accountType: "INDIVIDUAL",
    },
    {
      bankCode: "000002",
      bankName: "Access Bank",
      accountNumber: "0099887766",
      maskedNumber: "****7766",
      accountNameMatch: "MATCH",
      accountType: "INDIVIDUAL",
    },
    {
      bankCode: "000004",
      bankName: "Zenith Bank",
      accountNumber: "9999999999",
      maskedNumber: "****9999",
      accountNameMatch: "MISMATCH",
      accountType: "INDIVIDUAL",
    },
  ];
  for (const a of accounts) {
    await db.bankAccount.upsert({
      where: { accountNumber: a.accountNumber },
      create: a,
      update: {},
    });
  }
  console.log("  ✓ bank accounts:", accounts.length);

  // 5) Identity references (masked only)
  await db.identityReference.upsert({
    where: { referenceHash: "hash_chinimc_001" },
    create: {
      provider: "NIMC",
      type: "NIN",
      referenceHash: "hash_chinimc_001",
      maskedReference: "******1234",
      verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    update: {},
  });

  // 6) Verifications + evidence + trust scores for the demo persons
  const chioma = await db.person.findUnique({ where: { handle: "chioma" } });
  const tunde = await db.person.findUnique({ where: { handle: "tunde" } });
  const amaka = await db.person.findUnique({ where: { handle: "amaka" } });
  const bola = await db.person.findUnique({ where: { handle: "bola" } });

  if (chioma) {
    await seedTrustScore({
      subjectType: "PERSON",
      subjectId: chioma.id,
      dims: { identity: 200, account: 200, phone: 100, reputation: 100, resolution: 100 },
      signals: [
        "IDENTITY_VERIFIED",
        "ACCOUNT_NAME_VERIFIED",
        "PHONE_ACTIVE",
        "NO_CONFIRMED_FRAUD_FLAGS",
        "PREVIOUS_CHECKS_PASS",
      ],
      // 300 + 200+200+100+100+100 = 1000 → VERY_LOW risk
    });
  }
  if (amaka) {
    await seedTrustScore({
      subjectType: "PERSON",
      subjectId: amaka.id,
      dims: { identity: 150, account: 200, phone: 100, reputation: 100, resolution: 0 },
      signals: ["NIN_VERIFIED", "ACCOUNT_NAME_VERIFIED", "PHONE_ACTIVE", "NO_CONFIRMED_FRAUD_FLAGS"],
      // 300 + 150+200+100+100+0 = 850 → VERY_LOW
    });
  }
  if (tunde) {
    await seedTrustScore({
      subjectType: "PERSON",
      subjectId: tunde.id,
      dims: { identity: 150, account: 0, phone: 100, reputation: -250, resolution: -50 },
      signals: ["NIN_VERIFIED", "PHONE_ACTIVE", "ACTIVE_FRAUD_FLAG", "RESOLVED_FRAUD_FLAG"],
      // 300 + 150+0+100-250-50 = 250 → clamped 300 → CRITICAL
    });
  }
  if (bola) {
    await db.trustScore.upsert({
      where: { subjectType_subjectId: { subjectType: "PERSON", subjectId: bola.id } },
      create: {
        subjectType: "PERSON",
        subjectId: bola.id,
        score: -1,
        riskBand: "UNKNOWN",
        decision: "INSUFFICIENT",
        signals: JSON.stringify(["INSUFFICIENT_EVIDENCE"]),
        dimensions: JSON.stringify({ identity: 0, account: 0, phone: 0, reputation: 0, resolution: 0 }),
        policyVersion: DEFAULT_POLICY.version,
      },
      update: {},
    });
  }
  console.log("  ✓ trust scores seeded");

  // 7) Flags — illustrate the full lifecycle
  const phoneTunde = await db.phone.findUnique({ where: { numberE164: "07031112233" } });
  const accTunde = await db.bankAccount.findUnique({ where: { accountNumber: "0123456789" } });
  if (phoneTunde && accTunde && tunde) {
    await db.flag.upsert({
      where: { referenceCode: "TS-FLG-1001" },
      create: {
        referenceCode: "TS-FLG-1001",
        reporterLabel: "User · Lagos",
        subjectType: "BANK_ACCOUNT",
        subjectId: accTunde.id,
        category: "PAYMENT_FRAUD",
        description:
          "Sent ₦450,000 for MacBook; seller blocked contact after payment. NIBSS name-match confirmed but seller refuses resolution.",
        amount: 450000,
        evidenceUrl: "https://example.org/receipt.pdf",
        status: "UNDER_REVIEW",
      },
      update: {},
    });
    await db.flag.upsert({
      where: { referenceCode: "TS-FLG-1002" },
      create: {
        referenceCode: "TS-FLG-1002",
        reporterLabel: "Marketplace · Abuja",
        subjectType: "PHONE",
        subjectId: phoneTunde.id,
        category: "IMPERSONATION",
        description: "Impersonated a real-estate agent and requested upfront 'inspection fees'.",
        status: "RESPONDED",
      },
      update: {},
    });
    await db.flag.upsert({
      where: { referenceCode: "TS-FLG-1003" },
      create: {
        referenceCode: "TS-FLG-1003",
        reporterLabel: "Fintech · Lagos",
        subjectType: "PERSON",
        subjectId: tunde.id,
        category: "ACCOUNT_TAKEOVER",
        description: "Account-takeover signals detected during login anomaly review.",
        status: "CONFIRMED",
      },
      update: {},
    });
  }
  console.log("  ✓ flags seeded");

  // 8) Fraud signals (risk-signal network, not a public blacklist)
  if (tunde && phoneTunde) {
    await db.fraudSignal.upsert({
      where: { id: "fraud_seed_1" },
      create: {
        id: "fraud_seed_1",
        entityType: "PERSON",
        entityId: tunde.id,
        category: "ACCOUNT_TAKEOVER",
        confidence: 0.86,
        source: "FLAG",
        summary: "Confirmed ATO during anomaly review",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        reviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
      update: {},
    });
    await db.fraudSignal.upsert({
      where: { id: "fraud_seed_2" },
      create: {
        id: "fraud_seed_2",
        entityType: "PHONE",
        entityId: phoneTunde.id,
        category: "IMPERSONATION",
        confidence: 0.72,
        source: "COMMUNITY",
        summary: "Multiple marketplace impersonation reports",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        reviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      },
      update: {},
    });
  }
  console.log("  ✓ fraud signals seeded");

  // 9) API client + webhook
  const key = generateApiKey("live");
  await db.apiClient.upsert({
    where: { keyHash: key.hash },
    create: {
      name: "Demo Fintech — Acme Pay",
      keyPrefix: key.prefix,
      keyHash: key.hash,
      plainKeyHint: key.plain,
      permissions: JSON.stringify(["verify:phone", "verify:account", "trust:read", "fraudnet:read"]),
      environment: "live",
      status: "active",
    },
    update: {},
  });
  const client = await db.apiClient.findUnique({ where: { keyHash: key.hash } });
  if (client) {
    await db.webhook.upsert({
      where: { id: "webhook_seed_1" },
      create: {
        id: "webhook_seed_1",
        apiClientId: client.id,
        url: "https://acmepay.example.org/webhooks/trustscore",
        events: JSON.stringify([
          "verification.completed",
          "flag.created",
          "flag.resolved",
          "risk.updated",
        ]),
        secret: "whsec_demo_****",
        status: "active",
      },
      update: {},
    });
  }
  console.log("  ✓ api client + webhook seeded");

  // 10) Recent safety checks
  if (chioma && tunde && amaka) {
    const checks = [
      {
        requesterLabel: "Acme Pay",
        subjectType: "PERSON",
        subjectId: chioma.id,
        subjectDisplay: "Chioma Okafor",
        score: 1000,
        riskBand: "VERY_LOW",
        decision: "APPROVE",
        signals: JSON.stringify(["IDENTITY_VERIFIED", "ACCOUNT_NAME_VERIFIED", "PHONE_ACTIVE"]),
      },
      {
        requesterLabel: "RentRight",
        subjectType: "PERSON",
        subjectId: tunde.id,
        subjectDisplay: "Tunde Adeniji",
        score: 300,
        riskBand: "CRITICAL",
        decision: "DECLINE",
        signals: JSON.stringify(["ACTIVE_FRAUD_FLAG", "RESOLVED_FRAUD_FLAG"]),
      },
      {
        requesterLabel: "Acme Pay",
        subjectType: "PERSON",
        subjectId: amaka.id,
        subjectDisplay: "Amaka Eze",
        score: 850,
        riskBand: "VERY_LOW",
        decision: "APPROVE",
        signals: JSON.stringify(["NIN_VERIFIED", "ACCOUNT_NAME_VERIFIED"]),
      },
    ];
    for (const c of checks) {
      const existing = await db.safetyCheck.findFirst({
        where: { subjectId: c.subjectId, requesterLabel: c.requesterLabel },
      });
      if (!existing) await db.safetyCheck.create({ data: c });
    }
    // add a few time-staggered ones for the chart
    for (let i = 0; i < 12; i++) {
      await db.safetyCheck.create({
        data: {
          requesterLabel: ["Acme Pay", "RentRight", "MarketX", "LendCo"][i % 4],
          subjectType: "PHONE",
          subjectId: "seed_" + i,
          subjectDisplay: "+234 *** *** " + (1000 + i),
          score: 300 + ((i * 67) % 700),
          riskBand: ["CRITICAL", "HIGH", "ELEVATED", "MODERATE", "LOW", "VERY_LOW"][i % 6],
          decision: ["DECLINE", "DECLINE", "REVIEW", "REVIEW", "APPROVE", "APPROVE"][i % 6],
          signals: JSON.stringify(["AUTO"]),
          createdAt: new Date(Date.now() - (12 - i) * 1000 * 60 * 60 * 6),
        },
      });
    }
  }
  console.log("  ✓ safety checks seeded");

  // 11) Consent + audit log seeds
  await db.consent.upsert({
    where: { id: "consent_seed_1" },
    create: {
      id: "consent_seed_1",
      personId: chioma?.id,
      purpose: "IDENTITY_VERIFY",
      grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    },
    update: {},
  });
  await db.auditLog.create({
    data: {
      actor: "system",
      action: "platform.seed",
      metadata: JSON.stringify({ version: DEFAULT_POLICY.version }),
      redacted: true,
    },
  }).catch(() => {});
  console.log("  ✓ consent + audit");

  console.log("\n✅ Seed complete.");
  console.log(
    `\n   Demo API key (live): ${key.plain}\n   (shown once — treat as a secret in production)\n`
  );
}

async function seedTrustScore(opts: {
  subjectType: string;
  subjectId: string;
  dims: { identity: number; account: number; phone: number; reputation: number; resolution: number };
  signals: string[];
}) {
  const base = 300;
  const score =
    base +
    opts.dims.identity +
    opts.dims.account +
    opts.dims.phone +
    opts.dims.reputation +
    opts.dims.resolution;
  const clamped = Math.max(300, Math.min(1000, score));
  const band =
    clamped >= 850
      ? "VERY_LOW"
      : clamped >= 750
      ? "LOW"
      : clamped >= 650
      ? "MODERATE"
      : clamped >= 550
      ? "ELEVATED"
      : clamped >= 450
      ? "HIGH"
      : "CRITICAL";
  const decision =
    band === "VERY_LOW" || band === "LOW"
      ? "APPROVE"
      : band === "MODERATE" || band === "ELEVATED"
      ? "REVIEW"
      : "DECLINE";

  await db.trustScore.upsert({
    where: { subjectType_subjectId: { subjectType: opts.subjectType, subjectId: opts.subjectId } },
    create: {
      subjectType: opts.subjectType,
      subjectId: opts.subjectId,
      score: clamped,
      riskBand: band,
      decision,
      signals: JSON.stringify(opts.signals),
      dimensions: JSON.stringify(opts.dims),
      policyVersion: DEFAULT_POLICY.version,
    },
    update: {},
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
