import type { Message } from "../core/types.js";

/** Cheap, provider-independent estimate (~4 chars/token). Good enough for budgeting. */
export function estimateTokens(messages: readonly Message[]): number {
  const chars = messages.reduce(
    (n, m) =>
      n +
      m.content.length +
      JSON.stringify("toolCalls" in m ? (m.toolCalls ?? []) : []).length,
    0,
  );
  return Math.ceil(chars / 4);
}

export type Summarizer = (messages: readonly Message[]) => Promise<string>;

/**
 * Keep: system + original task + a summary of the middle + the last `keepLast` messages.
 * Never start the kept tail on a `tool` message (it would orphan its tool call).
 */
export async function compactMessages(
  messages: readonly Message[],
  summarize: Summarizer,
  keepLast = 4,
): Promise<Message[]> {
  const head = messages.slice(0, 2);
  let cut = Math.max(2, messages.length - keepLast);
  while (cut < messages.length && messages[cut]?.role === "tool") cut++;
  const middle = messages.slice(2, cut);
  if (middle.length === 0) return [...messages];
  const summary = await summarize(middle);
  return [
    ...head,
    {
      role: "user",
      content: `<summary_of_earlier_steps>\n${summary}\n</summary_of_earlier_steps>`,
    },
    ...messages.slice(cut),
  ];
}

/** Deterministic summarizer (no model): lists what tools ran. Swap for a model-backed one in prod. */
export const listToolsSummarizer: Summarizer = async (msgs) =>
  msgs
    .filter((m) => m.role === "tool")
    .map(
      (m) =>
        `- ${m.role === "tool" ? m.toolName : ""}: ${m.content.slice(0, 80).replace(/\s+/g, " ")}`,
    )
    .join("\n");
