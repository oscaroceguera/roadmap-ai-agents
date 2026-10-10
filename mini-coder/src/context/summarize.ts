import { generateText, type LanguageModel } from "ai";
import type { TurnMessages } from "./hydrate";

const SUMMARY_SYSTEM = `You compress a coding agent's work log into a short running summary.
Keep every concrete fact: file paths, function and variable names, values, error messages,
what was already changed, what is still left to do. Drop chit-chat. Be terse. Plain text.`;

export async function summarize(
  model: LanguageModel,
  oldTurns: TurnMessages[],
  priorSummary: string,
): Promise<string> {
  const transcript = oldTurns
    .flat()
    .map(
      (m) =>
        `${m.role}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`,
    )
    .join("\n");

  const { text } = await generateText({
    model,
    system: SUMMARY_SYSTEM,
    prompt: `Prior summary:\n${priorSummary || "(none)"}\n\nFold in this newer work:\n${transcript}\n\nReturn the updated summary.`,
  });

  return text;
}
