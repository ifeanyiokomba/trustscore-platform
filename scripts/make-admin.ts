// scripts/make-admin.ts — operational grant of the ADMIN role (Stage 8).
//
// Trust Engine administration (scoring policy versions, DPIA records, the
// automated-decision gate) is an OPERATIONAL grant — never self-service and
// never an API route. Usage:
//   bun run admin:make <email>
//
// Idempotent; prints the result. This is the documented sandbox path for
// demos and E2E tests (real deployments gate this behind internal
// governance + audit process, same as the Stage 7 reviewer grant).

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: bun run admin:make <email>");
    process.exit(1);
  }
  const user = await db.userAccount.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with email ${email}`);
    process.exit(1);
  }
  await db.userAccount.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });
  console.log(
    `OK — ${user.handle} (${email}) is now an ADMIN. They can sign in and open Trust Engine administration in the Trust Engine tab.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
