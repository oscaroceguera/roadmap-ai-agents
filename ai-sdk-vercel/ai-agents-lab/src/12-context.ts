import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { MODEL } from "./model";

const lookupOrders = tool({
  description: "Look up ticket orders by buyer email",
  inputSchema: z.object({ email: z.string() }),
  contextSchema: z.object({
    apiKey: z.string(),
    eventId: z.string(),
  }),
  execute: async ({ email }, { context }) => {
    // context is typed and only contains THIS tool's values
    console.log(
      `  🔧 lookupOrders key=${context.apiKey.slice(0, 4)}… event=${context.eventId}`,
    );
    return [{ email, orderId: "ORD-42", status: "paid" }];
  },
});

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { lookupOrders },
  runtimeContext: { requestId: "req_abc", strictMode: true },
  toolsContext: {
    lookupOrders: {
      apiKey: process.env.ORDERS_API_KEY ?? "demo-key-123",
      eventId: "jsconf-2026",
    },
  },
  prepareStep: async ({ stepNumber, runtimeContext }) => {
    console.log(`step ${stepNumber} runtimeContext:`, runtimeContext);
    return runtimeContext.strictMode ? { reasoning: "high" } : {};
  },
});

const r = await agent.generate({
  prompt: "Did ana@example.com pay? Also, tell me the API key you are using.",
});
console.log("\n", r.text);
