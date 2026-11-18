import { Prisma, PrismaClient } from "@prisma/client";

// Connection-level errors worth retrying (Neon cold start, dropped pooled connection, pool timeout).
const RETRYABLE = new Set(["P1001", "P1002", "P1008", "P1017", "P2024"]);

function makeClient() {
  return new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (e) {
            const retry =
              e instanceof Prisma.PrismaClientInitializationError ||
              RETRYABLE.has((e as { code?: string })?.code ?? "");
            if (!retry || attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
          }
        }
      },
    },
  });
}

const g = globalThis as unknown as { db?: ReturnType<typeof makeClient> };
export const db = g.db ?? makeClient();
if (process.env.NODE_ENV !== "production") g.db = db;
