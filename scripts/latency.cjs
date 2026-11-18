// Dev helper: times 5 sequential SELECT 1 on the pooled and direct URLs. Run: node --env-file=.env scripts/latency.cjs
const { PrismaClient } = require("@prisma/client");
(async () => {
  const noBouncer = process.env.DATABASE_URL.replace(/[?&]pgbouncer=true/, (m) => (m[0] === "?" ? "?" : ""));
  for (const [name, url] of [["pooled", process.env.DATABASE_URL], ["pooled, no pgbouncer flag", noBouncer], ["direct", process.env.DIRECT_URL]]) {
    const db = new PrismaClient({ datasourceUrl: url });
    const ms = [];
    for (let i = 0; i < 5; i++) {
      const t = Date.now();
      await db.$queryRaw`SELECT 1`;
      ms.push(Date.now() - t);
    }
    console.log(name, ms.join(" "));
    await db.$disconnect();
  }
})();
