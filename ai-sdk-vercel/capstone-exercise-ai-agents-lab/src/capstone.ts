import { createInterface } from "node:readline/promises";
import {
  conferenceAgent,
  callOptionsSchema,
  MAX_STEPS,
  TOKEN_BUDGET,
} from "./capstone/agent";
import { ModelMessage, ToolApprovalResponse } from "ai";

const rl = createInterface({ input: process.stdin, output: process.stdout });

// What the user types is just a string. The z.enum gives you types at compile time,
// but you still have to check the real input at runtime: safeParse does both.
const parsed = callOptionsSchema.safeParse({
  attendeeName: (await rl.question("? Your name: ")).trim(),
  ticketType: (await rl.question("? Ticket type (general/vip): "))
    .trim()
    .toLowerCase(),
});

if (!parsed.success) {
  console.error(
    "Invalid input:",
    parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(", "),
  );
  process.exit(1);
}

const options = parsed.data; // typed: { attendeeName: string; ticketType: 'general' | 'vip' }

const messages: ModelMessage[] = [
  { role: "user", content: await rl.question("? Ask: ") },
];

const totals = { runs: 0, steps: 0, tokens: 0 };
const t0 = Date.now();

const runOnce = () =>
  conferenceAgent.generate({
    messages,
    options,
    onStart({ modelId }) {
      totals.runs++;
      console.log(`▶ start ${modelId} (run ${totals.runs})`);
    },
    onStepStart({ stepNumber }) {
      console.log(`  · step ${stepNumber} starting`);
    },
    onToolExecutionStart({ toolCall }) {
      console.log(`    ↳ ${toolCall.toolName}`, toolCall.input);
    },
    onToolExecutionEnd({ toolCall, toolExecutionMs, toolOutput }) {
      const status =
        toolOutput.type === "tool-result" ? "ok" : `ERROR ${toolOutput.error}`;
      console.log(
        `    ↳ ${toolCall.toolName} done in ${toolExecutionMs}ms (${status})`,
      );
    },
    onStepEnd({ stepNumber, finishReason, toolCalls }) {
      console.log(
        `  · step ${stepNumber} end: ${finishReason}`,
        toolCalls?.map((t) => t.toolName) ?? [],
      );
    },
    onEnd({ steps, usage }) {
      totals.steps += steps.length;
      totals.tokens += usage.totalTokens ?? 0;
    },
  });

let result = await runOnce();
messages.push(...result.responseMessages);

// A run can stop for approval more than once, so loop until nothing is pending
while (true) {
  const responses: ToolApprovalResponse[] = [];
  for (const part of result.content) {
    if (part.type === "tool-approval-request" && !part.isAutomatic) {
      const answer = await rl.question(
        `⚠ Approve ${JSON.stringify(part.toolCall?.input ?? part)}? (y/n) `,
      );

      responses.push({
        type: "tool-approval-response",
        approvalId: part.approvalId,
        approved: answer.trim().toLowerCase() === "y",
      });
    }
  }

  if (responses.length === 0) break; // nothing waiting for a human → the run is done

  messages.push({ role: "tool", content: responses });
  result = await runOnce();
  messages.push(...result.responseMessages);
}

rl.close();

console.log(
  `■ end: ${totals.runs} run(s), ${totals.steps} steps, ${totals.tokens} tokens, ${Date.now() - t0}ms`,
);

const last = result.steps.at(-1);
if (last?.finishReason === "tool-calls") {
  console.log(
    `\n⛔ Stopped by a safety limit (${MAX_STEPS} steps or ${TOKEN_BUDGET} tokens). No final answer.`,
  );
} else {
  const { recommended, booked } = result.output;
  console.log("\nRecommended:");

  for (const t of recommended)
    console.log(`  #${t.id} ${t.title} (${t.track}, ${t.level})`);

  console.log("Booked:", booked.length ? booked.join(", ") : "nothing");
}
