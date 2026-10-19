import {
  ToolLoopAgent,
  tool,
  type ModelMessage,
  type ToolApprovalResponse,
} from "ai";
import { z } from "zod";
import { createInterface } from "node:readline/promises";
import { MODEL } from "./model";

const refundOrder = tool({
  description: "Refund a ticket order",
  inputSchema: z.object({ orderId: z.string(), amount: z.number() }),
  execute: async ({ orderId, amount }) => {
    console.log(`  💸 refunded ${orderId} $${amount}`);
    return {
      ok: true,
    };
  },
});

const agent = new ToolLoopAgent({
  model: MODEL,
  instructions:
    "When a tool execution is not approved, do not retry it. Explain and stop.",
  tools: { refundOrder },
  toolApproval: {
    // decide based on the (typed) input
    refundOrder: async ({ amount }) =>
      amount > 100 ? "user-approval" : undefined,
  },
});

const rl = createInterface({ input: process.stdin, output: process.stdout });

const messages: ModelMessage[] = [
  { role: "user", content: "Refund order ORD-42 for $250." },
];

// 1st call → stops at the approval request
const first = await agent.generate({ messages });
messages.push(...first.responseMessages);

const responses: ToolApprovalResponse[] = [];
for (const part of first.content) {
  if (part.type === "tool-approval-request" && !part.isAutomatic) {
    const answer = await rl.question(
      `Approve ${JSON.stringify(part.toolCall?.input ?? part)}? (y/n) `,
    );
    responses.push({
      type: "tool-approval-response",
      approvalId: part.approvalId,
      approved: answer.trim().toLowerCase() === "y",
    });
  }
}
rl.close();

// 2nd call → continues with the decision
messages.push({ role: "tool", content: responses });
const final = await agent.generate({ messages });
console.log("\n", final.text);
