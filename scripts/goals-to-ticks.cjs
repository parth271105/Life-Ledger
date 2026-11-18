// One-off: converts old amount-based goals (e.g. 2 of 10 pages) to tick boxes.
// A day counts as done only if the old target was met. Run: node --env-file=.env scripts/goals-to-ticks.cjs
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
(async () => {
  const goals = await db.goal.findMany({ where: { OR: [{ target: { not: 1 } }, { unit: { not: "" } }] } });
  for (const g of goals) {
    await db.$transaction([
      db.goalLog.deleteMany({ where: { goalId: g.id, value: { lt: g.target } } }),
      db.goalLog.updateMany({ where: { goalId: g.id }, data: { value: 1 } }),
      db.goal.update({ where: { id: g.id }, data: { target: 1, unit: "" } }),
    ]);
  }
  console.log("converted goals:", goals.length);
  await db.$disconnect();
})();
