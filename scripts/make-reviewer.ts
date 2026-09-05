// scripts/make-reviewer.ts — operational grant of the REVIEWER role.
//
// Reviewer access to the Stage 7 human-review queue is an OPERATIONAL grant
// (ops runbook / sandbox demos) — never a self-service setting and never an
// API route. Usage:
//   bun run reviewer:make <email>
//
// The script is idempotent and prints the result. This is the documented
// sandbox path for demos and E2E tests (real deployments gate this behind
// an internal admin + audit process).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: bun run reviewer:make <email>");
    process.exit(1);
  }
  const user = await db.userAccount.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with email ${email}`);
    process.exit(1);
  }
  await db.userAccount.update({
    where: { id: user.id },
    data: { role: "REVIEWER" },
  });
  console.log(
    `OK — ${user.handle} (${email}) is now a REVIEWER. They can sign in and open the review queue in the Reputation tab.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
