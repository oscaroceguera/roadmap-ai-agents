import { openai } from "@ai-sdk/openai";
import { generateText, tool, isStepCount } from "ai";
import { input, z } from "zod";

export type AgentRun = {
  text: string;
  toolCalls: {
    toolName: string;
    input: unknown;
  }[];
  usage: {
    uncachedInputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
  };
};

const SYSTEM = `Only call a tool when the answer requires information you don't have.
Definitional or conceptual questions need no tools.`;

export async function runAgent(
  prompt: string,
  opts: {
    model?: string;
    files?: Record<string, string>;
  } = {},
): Promise<AgentRun> {
  const files = { ...(opts.files ?? {}) };

  const { text, steps, usage } = await generateText({
    model: openai(opts.model ?? "gpt-5.6-luna"),
    system: SYSTEM,
    prompt,
    stopWhen: isStepCount(10),
    tools: {
      read_file: tool({
        description: "Read a UTF-8 text file from the workspace.",
        inputSchema: z.object({ path: z.string() }),
        execute: async ({ path }) =>
          files[path] ?? `ERROR: no such file: ${path}`,
      }),
      http_fetch: tool({
        description:
          "HTTP GET a URL. Returns the status code and the first 2000 characters of the body",
        inputSchema: z.object({ url: z.string().url() }),
        execute: async ({ url }) => {
          const res = await fetch(url);
          const body = (await res.text()).slice(0, 200);
          return `status: ${res.status}\n\n${body}`;
        },
      }),
    },
  });

  const d = usage.inputTokenDetails;
  if (d?.noCacheTokens === undefined) {
    // Falling back to usage.inputTokens here would double-bill every cached
    // token. Fail loudly instead of recording a plausible-looking wrong number.
    throw new Error(
      "usage.inputTokenDetails.noCacheTokens is missing — check your AI SDK version " +
        "and re-read the cost-column warning before pricing anything.",
    );
  }

  return {
    text,
    toolCalls: steps
      .flatMap((s) => s.toolCalls)
      .map((c) => ({ toolName: c.toolName, input: c.input })),
    usage: {
      uncachedInputTokens: d.noCacheTokens,
      cacheReadTokens: d.cacheReadTokens ?? 0,
      cacheWriteTokens: d.cacheWriteTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    },
  };
}
