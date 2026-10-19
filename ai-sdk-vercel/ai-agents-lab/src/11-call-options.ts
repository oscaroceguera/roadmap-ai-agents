// src/11-call-options.ts
import { ToolLoopAgent } from "ai";
import { z } from "zod";
import { MODEL } from "./model";

const supportAgent = new ToolLoopAgent({
  model: MODEL,
  instructions:
    "You are a helpful support agent for a conference ticketing site.",
  callOptionsSchema: z.object({
    userName: z.string(),
    ticketType: z.enum(["general", "vip", "speaker"]),
  }),
  prepareCall: ({ options, ...settings }) => ({
    ...settings, // ⚠️ always spread — the return value REPLACES settings
    instructions:
      settings.instructions +
      `\nUser: ${options.userName}. Ticket type: ${options.ticketType}.
VIP and speaker users get priority and access to the speaker lounge.`,
  }),
});

for (const ticketType of ["general", "vip"] as const) {
  const r = await supportAgent.generate({
    prompt: "Can I access the speaker lounge?",
    options: { userName: "Ana", ticketType },
  });
  console.log(`\n[${ticketType}]`, r.text);
}
