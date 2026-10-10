// A scriped mode: no network, no cost. Call n return turn(n)
import { MockLanguageModelV3 } from "ai/test";

type GenerateResult = Awaited<ReturnType<MockLanguageModelV3["doGenerate"]>>;
type Turn = {
  text?: string;
  call?: { name: string; input: object };
  finish?: "stop" | "length" | "tool-calls";
  tokens?: number;
};

export function scriptedModel(turn: (n: number) => Turn) {
  let n = 0;

  return new MockLanguageModelV3({
    doGenerate: async (): Promise<GenerateResult> => {
      const t = turn(n++);
      return {
        content: t.call
          ? [
              {
                type: "tool-call",
                toolCallId: `call-${n}`,
                toolName: t.call.name,
                input: JSON.stringify(t.call.input),
              },
            ]
          : [{ type: "text", text: t.text ?? "done" }],
        finishReason: {
          unified: t.finish ?? (t.call ? "tool-calls" : "stop"),
          raw: undefined,
        },
        usage: {
          inputTokens: {
            total: t.tokens ?? 10,
            noCache: undefined,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: 1,
            text: undefined,
            reasoning: undefined,
          },
        },
        warnings: [],
      };
    },
  });
}

export function demoModel() {
  const script: Turn[] = [
    { call: { name: "grep", input: { pattern: "formatCents" } } },
    { call: { name: "read_file", input: { path: "src/money.ts" } } },
    { call: { name: "bash", input: { command: "npx vitest run" } } },
    {
      text: "Scripted demo: formatCents lives in src/money.ts and 3 tests fail.",
    },
  ];

  return scriptedModel((n) => script[Math.min(n, script.length - 1)]);
}
