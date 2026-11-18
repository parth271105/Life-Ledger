// Dev helper: counts rows per table (no personal data printed). Run: node --env-file=.env scripts/peek.cjs
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const out = {};
  for (const m of ["user", "goal", "goalLog", "weightLog", "task", "transaction", "budget", "pushSubscription", "loginAttempt"]) out[m] = await db[m].count();
  console.log(out);
  await db.$disconnect();
})();
