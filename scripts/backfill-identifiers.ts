// AUTH batch — one-time identifier backfill: create USERNAME + EMAIL
// AuthIdentifier rows for every pre-AUTH-batch account (idempotent).
// Run: bun scripts/backfill-identifiers.ts

import { backfillIdentifiers } from "../src/lib/services/auth-identifier-service";

async function main() {
  const { created } = await backfillIdentifiers();
  console.log(`backfill complete — ${created} identifiers created`);
}

main()
  .catch((e) => {
    console.error("backfill failed:", e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
