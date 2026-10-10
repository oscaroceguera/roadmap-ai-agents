import { desc } from "drizzle-orm";
import { bigserial, jsonb, pgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { EventRow } from "./events";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Put Neon's DIRECT url (no-pooler) in .env, or set EVENTS_FILE to log JSONL.",
  );
}

// onnotice: silence Postgres' "relation already exists, skipping" on every start.
const sql = postgres(url, { max: 5, onnotice: () => {} });
const db = drizzle(sql);

const eventLog = pgTable("event_log", {
  seq: bigserial("seq", { mode: "number" }).primaryKey(), // insertion order = replay order
  data: jsonb("data").$type<EventRow>().notNull(), // the whole event, as-is
});

// One table, so no migration tool: create it on first use. Top-level await runs once per process.
await sql`CREATE TABLE IF NOT EXISTS event_log (seq bigserial PRIMARY KEY, data jsonb NOT NULL)`;

export async function insertEvent(row: EventRow) {
  await db.insert(eventLog).values({ data: row });
}

// The last `limit` events, oldest first (for `pnpm start log`).
export async function recentEvents(limit: number): Promise<EventRow[]> {
  const rows = await db
    .select()
    .from(eventLog)
    .orderBy(desc(eventLog.seq))
    .limit(limit);
  return rows.map((r) => r.data).reverse();
}

// "one query": what did each run cost, and where did the time go?
export async function costByRun(limit: number) {
  return sql`
    SELECT data->>'runId' AS run,
      count(*) FILTER (WHERE data->>'type' = 'turn.completed') AS turns,
      round(coalesce(sum((data->>'costUsd')::numeric), 0), 6) AS cost_usd,
      round(coalesce(sum((data->>'ms')::numeric) FILTER (WHERE data->>'type' = 'tool.completed'), 0)) AS tool_ms,
      round(coalesce(sum((data->>'ms')::numeric) FILTER (WHERE data->>'type' = 'turn.completed'), 0)) AS model_ms
    FROM event_log GROUP BY 1 ORDER BY min(seq) DESC LIMIT ${limit}`;
}

// postgres.js keeps its sockets open, and open sockets keep Node alive: without this the CLI never exits.
export async function close() {
  await sql.end();
}
