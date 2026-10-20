import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const ApprovalSchema = z.object({
  id: z.string(),
  runId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
  status: z.enum(["pending", "approved", "denied"]),
  createdAt: z.string(),
  decidedAt: z.string().optional(),
});
export type Approval = z.infer<typeof ApprovalSchema>;
export type NewApproval = Pick<
  Approval,
  "runId" | "toolCallId" | "toolName" | "input"
>;

/** Swap implementations (memory, JSON file, SQLite, Postgres) without touching the harness. */
export interface ApprovalStore {
  create(a: NewApproval): Promise<Approval>;
  get(id: string): Promise<Approval | undefined>;
  list(filter?: { status?: Approval["status"] }): Promise<Approval[]>;
  decide(
    id: string,
    decision: "approved" | "denied",
  ): Promise<Approval | undefined>;
}

const make = (a: NewApproval): Approval => ({
  ...a,
  id: randomUUID(),
  status: "pending",
  createdAt: new Date().toISOString(),
});

export class MemoryApprovalStore implements ApprovalStore {
  protected items = new Map<string, Approval>();
  async create(a: NewApproval) {
    const x = make(a);
    this.items.set(x.id, x);
    await this.persist();
    return x;
  }
  async get(id: string) {
    await this.load();
    return this.items.get(id);
  }
  async list(filter: { status?: Approval["status"] } = {}) {
    await this.load();
    return [...this.items.values()].filter(
      (a) => !filter.status || a.status === filter.status,
    );
  }
  async decide(id: string, decision: "approved" | "denied") {
    await this.load();
    const a = this.items.get(id);
    if (!a || a.status !== "pending") return a; // idempotent: first decision wins
    const updated: Approval = {
      ...a,
      status: decision,
      decidedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    await this.persist();
    return updated;
  }
  protected async load(): Promise<void> {}
  protected async persist(): Promise<void> {}
}

/** Same behaviour, survives restarts. Atomic write via temp file + rename. */
export class JsonFileApprovalStore extends MemoryApprovalStore {
  constructor(private readonly file: string) {
    super();
  }
  protected override async load() {
    try {
      const data = z
        .array(ApprovalSchema)
        .parse(JSON.parse(await readFile(this.file, "utf8")));
      this.items = new Map(data.map((a) => [a.id, a]));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  protected override async persist() {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await writeFile(tmp, JSON.stringify([...this.items.values()], null, 2));
    await rename(tmp, this.file);
  }
}

/** Blocks the agent until a human decides (or times out => deny). */
export async function waitForDecision(
  store: ApprovalStore,
  id: string,
  opts: { pollMs?: number; timeoutMs?: number } = {},
): Promise<"approved" | "denied"> {
  const deadline = Date.now() + (opts.timeoutMs ?? 5 * 60_000);
  while (Date.now() < deadline) {
    const a = await store.get(id);
    if (a && a.status !== "pending") return a.status;
    await new Promise((r) => setTimeout(r, opts.pollMs ?? 500));
  }
  return "denied";
}
