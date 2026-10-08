// Real model window
export const WINDOW = Number(process.env.CONTEXT_WINDOW ?? 400_000);

export type Budget = { window: number; compactAt: number; keepRecent: number };

export function budgetFor(window: number): Budget {
  return {
    window,
    compactAt: Math.floor(window * 0.8),
    keepRecent: Math.floor(window * 0.3),
  };
}

export type Compaction = "summarize" | "truncate";
// trigger on a token ESTIATE, no a turn count
export const COMPACTION: Compaction =
  process.env.COMPACTION === "truncate" ? "truncate" : "summarize";
