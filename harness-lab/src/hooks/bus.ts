import { z } from "zod";

export const HookEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("PreToolUse"),
    runId: z.string(),
    step: z.number(),
    toolCallId: z.string(),
    toolName: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("PostToolUse"),
    runId: z.string(),
    step: z.number(),
    toolCallId: z.string(),
    toolName: z.string(),
    ok: z.boolean(),
    output: z.string(),
  }),
  z.object({
    type: z.literal("PreCompact"),
    runId: z.string(),
    step: z.number(),
    estimatedTokens: z.number(),
  }),
  z.object({
    type: z.literal("Stop"),
    runId: z.string(),
    step: z.number(),
    stopReason: z.string(),
    finalText: z.string(),
  }),
]);
export type HookEvent = z.infer<typeof HookEventSchema>;
export type HookType = HookEvent["type"];
export type EventOf<T extends HookType> = Extract<HookEvent, { type: T }>;

/** A PreToolUse hook may block. Other hooks just observe. */
export type HookResult = void | { decision: "block"; reason: string };
export type Handler<T extends HookType> = (
  e: EventOf<T>,
) => HookResult | Promise<HookResult>;

type AnyHandler = (e: HookEvent) => HookResult | Promise<HookResult>;

export class HookBus {
  private readonly handlers = new Map<HookType, AnyHandler[]>();

  /** Returns an unsubscribe function. */
  on<T extends HookType>(type: T, handler: Handler<T>): () => void {
    const h = handler as unknown as AnyHandler;
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), h]);
    return () =>
      this.handlers.set(
        type,
        (this.handlers.get(type) ?? []).filter((x) => x !== h),
      );
  }

  /** Validates the event, runs handlers in order, returns the first block (if any). */
  async emit(
    event: HookEvent,
  ): Promise<{ blocked: false } | { blocked: true; reason: string }> {
    const e = HookEventSchema.parse(event);
    for (const h of this.handlers.get(e.type) ?? []) {
      const r = await h(e);
      if (r && r.decision === "block")
        return { blocked: true, reason: r.reason };
    }
    return { blocked: false };
  }
}
