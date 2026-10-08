import type { ModelMessage } from "ai";
import { estimateTokens } from "./tokens";

export type TurnMessages = ModelMessage[];

// One turn = what the model said (its tool calls) + the tool results. Always kept or dropped TOGETHER:
// a tool result without the call that asked for it is an invalid prompt.
export function buildContext(
  task: string,
  summary: string,
  turns: TurnMessages[],
): ModelMessage[] {
  // pinned: never summarized, never dropped
  const context: ModelMessage[] = [{ role: "user", content: task }];

  if (summary) {
    // A user message, not the system prompt: the summary is built from tool output, which is untrusted
    context.push({
      role: "user",
      content: `<summary_of_earlier_work>\n${summary}\n</summary_of_earlier_work>`,
    });
  }

  for (const turn of turns) context.push(...turn);
  return context;
}

// Split the history into old turns (to compact) and recent turns (to keep word for word).
// Walks back from the newest turn while the recent part fits in `keepRecent` tokens. Always keeps the last turn.
export function splitTurns(
  turns: TurnMessages[],
  keepRecent: number,
): { old: TurnMessages[]; recent: TurnMessages[] } {
  let tokens = 0;
  let cut = turns.length;
  while (cut > 0) {
    const next = estimateTokens(turns[cut - 1]);

    if (cut < turns.length && tokens + next > keepRecent) break;
    tokens += next;
    cut--;
  }

  return {
    old: turns.slice(0, cut),
    recent: turns.slice(cut),
  };
}

// When even the recent turns are too big, clip TOOL RESULTS, oldest first, until they fit.
// Needed because one turn can hold many results: models batch calls ("read these 10 files"), so a single
// turn can be bigger than the whole window, and splitTurns can't drop it. The call stays, only its output
// becomes a short note, so the history is still valid and the model knows it can call the tool again.
export function clipToolResults(
  turns: TurnMessages[],
  maxTokens: number,
): { turns: TurnMessages[]; clipped: number } {
  let clipped = 0;
  const out = turns.map((t) =>
    t.map((m) => (m.role === "tool" ? { ...m, content: [...m.content] } : m)),
  );

  for (const m of out.flat()) {
    if (m.role !== "tool") continue;
    for (let i = 0; i < m.content.length; i++) {
      if (estimateTokens(out.flat()) <= maxTokens)
        return { turns: out, clipped };

      const part = m.content[i];
      if (part.type !== "tool-result") continue;
      const size = JSON.stringify(part.output).length;
      if (size < 400) continue;

      m.content[i] = {
        ...part,
        output: {
          type: "json",
          value: {
            ok: true,
            clipped: true,
            note: `Output removed to fit the context window (was ${size} chars). Call ${part.toolName} again if you still need it.`,
          },
        },
      };
      clipped++;
    }
  }
  return { turns: out, clipped };
}
