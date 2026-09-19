// tests/batch2_db_ops.ts — DB fixtures/inspection for tests/batch2_matrix.py
// (batch2-matrix). NOT application code: only the matrix's G7 duplicate-identity
// seed (the LIVE-condition simulation — MOCK subjects are userId-derived, so
// duplicates never occur naturally), session/identity/notification/audit
// inspection, the DMMF-driven DSR erasure-cascade scan (the PR2 invariant), the
// ada negative control, and fixture cleanup run through here.
//
// Usage: bunx tsx tests/batch2_db_ops.ts <command> [args...]
// Commands:
//   seed-duplicate <holderUserId> <claimantUserId>
//       Seed TrustIdentity{ userId: holder, status: "VERIFIED", assuranceLevel: 1,
//       provider: "NINAUTH_MOCK", providerMode: "MOCK",
//       providerIdentityRef: maskedSubjectFor(claimant), verifiedAt: now,
//       expiresAt: +90d } — the exact condition the G7 guard must refuse: the
//       claimant's NINAuth subject is already VERIFIED on the holder's account.
//   clear-duplicate <userId>     -> set that TrustIdentity row REVOKED (the guard
//                                   only blocks on VERIFIED — freshness released)
//   session-status <sessionId>   -> {status, errorReason, completedAt}
//   trust-identity <userId>      -> the TrustIdentity row (or {found:false})
//   notifications <userId>       -> SECURITY-type notifications for that user
//   audit-count <userId> <action>-> {count, sampleMetadata} for AuditEvent rows
//   dsr-scan <userId>            -> DMMF-driven erasure-cascade zero-rows scan
//   ada-counts                   -> per-model row counts for ada (negative control)
//   cleanup-b2mx [userId...]     -> best-effort delete of b2mx_* fixtures + audit
//                                   rows for the given (possibly already-deleted,
//                                   DSR-erased) user ids
//
// Every command prints exactly one JSON line on stdout (parsed by the python
// matrix). Keep invocations short-lived: SQLite has a single writer and the dev
// server holds the file open.
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { maskedSubjectFor } from "@/lib/providers/ninauth";

// ---------------------------------------------------------------------------
// DMMF-driven model enumeration (Prisma runtime metadata — the PR2 invariant's
// engine). Two views, both computed fresh on every call so FUTURE models with a
// user FK can never silently escape the scan:
//   byFieldName — the letter of the task: every model with a scalar field
//                 literally named `userId`.
//   byRelation  — the stronger invariant: EVERY model holding a non-list
//                 relation to UserAccount, whatever its FK field is called
//                 (userId / ownerId / subjectId / verifierId / aUserId / ...).
//                 SharedSignal.subjectUserId and SafetyCheck.verifierId are the
//                 live examples a field-name scan would miss.
// AuditEvent deliberately has NO UserAccount relation (tombstones survive the
// cascade by design) — it is reported separately.
// ---------------------------------------------------------------------------

const camel = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

interface DmmfField {
  name: string;
  kind: string;
  type: string;
  isList: boolean;
  relationFromFields?: string[];
  relationOnDelete?: string;
}

async function userScan(userId: string): Promise<{
  byFieldName: Record<string, number>;
  byRelation: Record<string, number>;
  userIdFieldModels: number;
  userRelationModels: number;
  nonCascadeUserRelations: string[];
}> {
  const models = Prisma.dmmf.datamodel.models as unknown as {
    name: string;
    fields: DmmfField[];
  }[];
  const byFieldName: Record<string, number> = {};
  const byRelation: Record<string, number> = {};
  const nonCascadeUserRelations: string[] = [];

  for (const m of models) {
    if (m.name === "UserAccount") continue;

    if (m.fields.some((f) => f.name === "userId")) {
      byFieldName[m.name] = await (db as unknown as Record<string, { count: (a: unknown) => Promise<number> }>)[
        camel(m.name)
      ].count({ where: { userId } });
    }

    const userFks = m.fields
      .filter((f) => f.kind === "object" && f.type === "UserAccount" && !f.isList)
      .flatMap((f) => f.relationFromFields ?? []);
    if (userFks.length) {
      byRelation[m.name] = await (db as unknown as Record<string, { count: (a: unknown) => Promise<number> }>)[
        camel(m.name)
      ].count({ where: { OR: userFks.map((fk) => ({ [fk]: userId })) } });
      for (const f of m.fields) {
        if (
          f.kind === "object" &&
          f.type === "UserAccount" &&
          !f.isList &&
          f.relationOnDelete &&
          f.relationOnDelete !== "Cascade"
        ) {
          nonCascadeUserRelations.push(`${m.name}.${f.name}(${f.relationOnDelete})`);
        }
      }
    }
  }

  return {
    byFieldName,
    byRelation,
    userIdFieldModels: Object.keys(byFieldName).length,
    userRelationModels: Object.keys(byRelation).length,
    nonCascadeUserRelations,
  };
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "seed-duplicate": {
      const [holderId, claimantId] = args;
      const subject = maskedSubjectFor(claimantId);
      // Idempotent: TrustIdentity.userId is unique — drop any stale row first.
      await db.trustIdentity.deleteMany({ where: { userId: holderId } });
      const row = await db.trustIdentity.create({
        data: {
          userId: holderId,
          status: "VERIFIED",
          assuranceLevel: 1,
          provider: "NINAUTH_MOCK",
          providerMode: "MOCK",
          providerIdentityRef: subject,
          verifiedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(
        JSON.stringify({
          ok: true,
          trustIdentityId: row.id,
          subject,
          holderId,
          claimantId,
        })
      );
      break;
    }
    case "clear-duplicate": {
      const r = await db.trustIdentity.updateMany({
        where: { userId: args[0] },
        data: { status: "REVOKED" },
      });
      console.log(JSON.stringify({ ok: true, revoked: r.count }));
      break;
    }
    case "session-status": {
      const r = await db.verificationSession.findUnique({ where: { id: args[0] } });
      console.log(
        JSON.stringify(
          r
            ? { found: true, status: r.status, errorReason: r.errorReason, completedAt: r.completedAt }
            : { found: false }
        )
      );
      break;
    }
    case "trust-identity": {
      const r = await db.trustIdentity.findUnique({ where: { userId: args[0] } });
      console.log(
        JSON.stringify(
          r
            ? {
                found: true,
                id: r.id,
                status: r.status,
                assuranceLevel: r.assuranceLevel,
                provider: r.provider,
                providerMode: r.providerMode,
                providerIdentityRef: r.providerIdentityRef,
                verifiedAt: r.verifiedAt,
                expiresAt: r.expiresAt,
              }
            : { found: false }
        )
      );
      break;
    }
    case "notifications": {
      const rows = await db.notification.findMany({
        where: { userId: args[0] },
        select: { type: true, title: true, body: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      console.log(JSON.stringify(rows));
      break;
    }
    case "audit-count": {
      const [userId, action] = args;
      const count = await db.auditEvent.count({ where: { actorId: userId, action } });
      const first = await db.auditEvent.findFirst({
        where: { actorId: userId, action },
        select: { metadata: true, subjectType: true, subjectId: true },
      });
      console.log(JSON.stringify({ count, sample: first ?? null }));
      break;
    }
    case "dsr-scan": {
      const userId = args[0];
      const scan = await userScan(userId);
      const userExists = (await db.userAccount.count({ where: { id: userId } })) > 0;
      const auditEvents = await db.auditEvent.count({ where: { actorId: userId } });
      const tombstone = await db.auditEvent.count({
        where: { actorId: userId, action: "DSR_DELETE_COMPLETED" },
      });
      console.log(
        JSON.stringify({ ok: true, userId, userExists, auditEvents, tombstone, ...scan })
      );
      break;
    }
    case "ada-counts": {
      const ada = await db.userAccount.findUnique({ where: { handle: "ada" } });
      if (!ada) {
        console.log(JSON.stringify({ ok: false, found: false }));
        break;
      }
      const scan = await userScan(ada.id);
      console.log(JSON.stringify({ ok: true, found: true, userId: ada.id, ...scan }));
      break;
    }
    case "cleanup-b2mx": {
      const users = await db.userAccount.findMany({
        where: { handle: { startsWith: "b2mx_" } },
        select: { id: true, handle: true },
      });
      const foundIds = users.map((u) => u.id);
      const extraIds = args.filter(Boolean);
      const allIds = [...new Set([...foundIds, ...extraIds])];

      const summary: Record<string, number> = {};
      const del = async (name: string, fn: () => Promise<{ count: number }>) => {
        try {
          const r = await fn();
          summary[name] = r?.count ?? -1;
        } catch {
          summary[name] = -1;
        }
      };

      // Audit rows survive the user cascade BY DESIGN (tombstones) — remove
      // them explicitly, including for ids whose user row is already gone
      // (the DSR-erased fixture).
      if (allIds.length) {
        await del("auditEvent-actor", () =>
          db.auditEvent.deleteMany({ where: { actorId: { in: allIds } } })
        );
        await del("auditEvent-subject", () =>
          db.auditEvent.deleteMany({ where: { subjectId: { in: allIds } } })
        );
      }
      // Belt+braces child deletes (most already cascade from UserAccount).
      if (foundIds.length) {
        await del("session", () => db.session.deleteMany({ where: { userId: { in: foundIds } } }));
        await del("verificationSession", () =>
          db.verificationSession.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("passwordResetSession", () =>
          db.passwordResetSession.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("authIdentifier", () =>
          db.authIdentifier.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("notification", () =>
          db.notification.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("trustScoreSnapshot", () =>
          db.trustScoreSnapshot.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("trustIdentity", () =>
          db.trustIdentity.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("consent", () => db.consent.deleteMany({ where: { userId: { in: foundIds } } }));
        await del("evidence", () => db.evidence.deleteMany({ where: { userId: { in: foundIds } } }));
        await del("shareToken", () =>
          db.shareToken.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("credential", () =>
          db.credential.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("trustReceipt", () =>
          db.trustReceipt.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("dsrRequest", () =>
          db.dsrRequest.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("networkMembership", () =>
          db.networkMembership.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("phoneVerification", () =>
          db.phoneVerification.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("livenessSession", () =>
          db.livenessSession.deleteMany({ where: { userId: { in: foundIds } } })
        );
        await del("businessAccount", () =>
          db.businessAccount.deleteMany({ where: { ownerId: { in: foundIds } } })
        );
      }
      await del("userAccount", () =>
        db.userAccount.deleteMany({ where: { handle: { startsWith: "b2mx_" } } })
      );
      console.log(
        JSON.stringify({
          ok: true,
          handles: users.map((u) => u.handle),
          purgedUserIds: allIds,
          summary,
        })
      );
      break;
    }
    default:
      console.log(JSON.stringify({ ok: false, reason: "unknown_command", cmd }));
      process.exit(2);
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
