// auth_matrix_db_ops.ts — DB fixtures/inspection for tests/auth_matrix.py
// (auth-7). NOT application code: only the matrix's simulated clock-skew,
// verification marks, ada guard and account cleanup run through here.
// Usage: bun run tests/auth_matrix_db_ops.ts <command> [args]
// Commands:
//   phone-expire <sessionId>          -> set PhoneLoginSession.expiresAt in the past (status stays PENDING)
//   phone-status <sessionId>          -> print {status, attempts, expiresAt}
//   google-code-expire <sessionId>    -> set GoogleLoginSession.authorizationCodeExp in the past (status stays GRANTED)
//   google-status <sessionId>         -> print {status, errorReason}
//   session-expire <rawToken>         -> set Session.expiresAt in the past (by sha256 tokenHash)
//   verify-email <email>              -> mark the EMAIL AuthIdentifier verified
//   count-users-by-email <email>      -> print count of UserAccount rows with that email
//   phone-identifiers <userId>        -> print the account's AuthIdentifier rows
//   check-ada                         -> print whether ada's SuperSecret1 verifies + her identifiers
//   restore-ada                       -> force ada's password back to SuperSecret1
//   cleanup-authmx                    -> best-effort delete of authmx_* accounts + related rows
import { db } from "../src/lib/db";
import { sha256Hex, hashPassword, verifyPassword } from "../src/lib/platform/crypto";

const PAST = () => new Date(Date.now() - 60 * 60_000);

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "phone-expire": {
      const r = await db.phoneLoginSession.update({
        where: { id: args[0] },
        data: { expiresAt: PAST() },
      });
      console.log(JSON.stringify({ ok: true, id: r.id, expiresAt: r.expiresAt }));
      break;
    }
    case "phone-status": {
      const r = await db.phoneLoginSession.findUnique({ where: { id: args[0] } });
      console.log(
        JSON.stringify(
          r
            ? { status: r.status, attempts: r.attempts, expiresAt: r.expiresAt }
            : { status: null, attempts: null }
        )
      );
      break;
    }
    case "google-code-expire": {
      const r = await db.googleLoginSession.update({
        where: { id: args[0] },
        data: { authorizationCodeExp: PAST() },
      });
      console.log(JSON.stringify({ ok: true, id: r.id, status: r.status }));
      break;
    }
    case "google-status": {
      const r = await db.googleLoginSession.findUnique({ where: { id: args[0] } });
      console.log(
        JSON.stringify(r ? { status: r.status, errorReason: r.errorReason } : { status: null })
      );
      break;
    }
    case "session-expire": {
      const r = await db.session.updateMany({
        where: { tokenHash: sha256Hex(args[0]) },
        data: { expiresAt: PAST() },
      });
      console.log(JSON.stringify({ ok: true, count: r.count }));
      break;
    }
    case "verify-email": {
      const r = await db.authIdentifier.updateMany({
        where: { type: "EMAIL", value: args[0] },
        data: { verified: true, verifiedAt: new Date() },
      });
      console.log(JSON.stringify({ ok: true, count: r.count }));
      break;
    }
    case "count-users-by-email": {
      const r = await db.userAccount.count({ where: { email: args[0] } });
      console.log(JSON.stringify({ count: r }));
      break;
    }
    case "phone-identifiers": {
      const rows = await db.authIdentifier.findMany({
        where: { userId: args[0] },
        select: { type: true, verified: true, isPrimary: true, hint: true },
      });
      console.log(JSON.stringify(rows));
      break;
    }
    case "check-ada": {
      const ada = await db.userAccount.findUnique({ where: { email: "ada@example.com" } });
      if (!ada) {
        console.log(JSON.stringify({ found: false }));
        break;
      }
      const works = verifyPassword("SuperSecret1", ada.passwordSalt, ada.passwordHash);
      const idents = await db.authIdentifier.findMany({
        where: { userId: ada.id },
        select: { type: true, value: true, verified: true },
      });
      console.log(JSON.stringify({ found: true, superSecret1Works: works, identifiers: idents }));
      break;
    }
    case "restore-ada": {
      const ada = await db.userAccount.findUnique({ where: { email: "ada@example.com" } });
      if (!ada) {
        console.log(JSON.stringify({ ok: false, reason: "not_found" }));
        break;
      }
      const { hash, salt } = hashPassword("SuperSecret1");
      await db.userAccount.update({
        where: { id: ada.id },
        data: { passwordHash: hash, passwordSalt: salt },
      });
      console.log(JSON.stringify({ ok: true, restored: true }));
      break;
    }
    case "cleanup-authmx": {
      const users = await db.userAccount.findMany({
        where: { handle: { startsWith: "authmx_" } },
        select: { id: true, handle: true },
      });
      const ids = users.map((u) => u.id);
      const summary: Record<string, number> = {};
      const del = async (name: string, fn: () => Promise<unknown>) => {
        try {
          const r: any = await fn();
          summary[name] = typeof r?.count === "number" ? r.count : -1;
        } catch (e) {
          summary[name] = -1;
        }
      };
      if (ids.length) {
        await del("session", () => db.session.deleteMany({ where: { userId: { in: ids } } }));
        await del("verificationSession", () =>
          db.verificationSession.deleteMany({ where: { userId: { in: ids } } })
        );
        await del("passwordResetSession", () =>
          db.passwordResetSession.deleteMany({ where: { userId: { in: ids } } })
        );
        await del("authIdentifier", () =>
          db.authIdentifier.deleteMany({ where: { userId: { in: ids } } })
        );
        await del("notification", () =>
          db.notification.deleteMany({ where: { userId: { in: ids } } })
        );
        await del("trustScoreSnapshot", () =>
          db.trustScoreSnapshot.deleteMany({ where: { userId: { in: ids } } })
        );
        await del("trustIdentity", () =>
          db.trustIdentity.deleteMany({ where: { userId: { in: ids } } })
        );
        await del("auditEvent-actor", () =>
          db.auditEvent.deleteMany({ where: { actorId: { in: ids } } })
        );
        await del("auditEvent-subject", () =>
          db.auditEvent.deleteMany({ where: { subjectId: { in: ids } } })
        );
      }
      await del("userAccount", () =>
        db.userAccount.deleteMany({ where: { handle: { startsWith: "authmx_" } } })
      );
      console.log(JSON.stringify({ ok: true, handles: users.map((u) => u.handle), summary }));
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
