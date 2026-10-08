import type { ModelMessage } from "ai";

export function estimateText(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateTokens(messages: ModelMessage[]): number {
  return messages.reduce(
    (n, m) =>
      n +
      estimateText(
        typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      ),
    0,
  );
}
