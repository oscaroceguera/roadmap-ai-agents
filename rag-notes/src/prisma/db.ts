import "dotenv/config";
// Node 24 has no global Temporal; Prisma's DateTime codecs need it.
import "temporal-polyfill/global";
import pgvector from "@prisma/orm-extension-pgvector/runtime";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "./contract.d";
import contractJson from "./contract.json" with { type: "json" };

const createDb = () =>
  postgres<Contract>({
    contractJson,
    extensions: [pgvector],
    url: process.env.DATABASE_URL!,
  });

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
