// tests/batch3_db_ops.ts — DB fixtures for the Batch 3 journey-UX E2E.
// NOT application code. Commands:
//
//   expire-session <sessionId>  -> set a VerificationSession row's expiresAt
//                                  into the past (client countdown then hits 0
//                                  on its next 1s tick, exactly like a real
//                                  10-minute TTL lapse — no waiting).
//   latest-session <email>      -> newest VerificationSession for that user
//                                  (id, status, expiresAt) — the E2E needs the
//                                  id of the session the UI just opened.
//
// Prints exactly one JSON line. Keep invocations short-lived: SQLite has a
// single writer and the dev server holds the file open.

import { db } from "../src/lib/db";

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "latest-session" && arg) {
    const s = await db.verificationSession.findFirst({
      where: { user: { email: arg } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, expiresAt: true },
    });
    console.log(JSON.stringify(s ?? { found: false }));
    return;
  }
  if (cmd === "expire-session" && arg) {
    const updated = await db.verificationSession.update({
      where: { id: arg },
      data: { expiresAt: new Date(Date.now() - 60_000) },
      select: { id: true, status: true, expiresAt: true },
    });
    console.log(JSON.stringify({ ok: true, ...updated }));
    return;
  }
  if (cmd === "cleanup-sessions" && arg) {
    // Test-artifact removal: VerificationEvent rows cascade; Consent/Evidence
    // hold sessionId as plain optional provenance strings (no FK), so deleting
    // an abandoned/failed session never touches real consent provenance.
    const ids = process.argv.slice(3);
    const deleted = await db.verificationSession.deleteMany({
      where: { id: { in: ids } },
    });
    console.log(JSON.stringify({ ok: true, deleted: deleted.count }));
    return;
  }
  console.log(JSON.stringify({ error: "usage: expire-session <id> | latest-session <email> | cleanup-sessions <id...>" }));
  process.exit(1);
}

main()
  .catch((err) => {
    console.log(JSON.stringify({ error: String(err) }));
    process.exit(1);
  })
  .finally(() => db.$disconnect());
