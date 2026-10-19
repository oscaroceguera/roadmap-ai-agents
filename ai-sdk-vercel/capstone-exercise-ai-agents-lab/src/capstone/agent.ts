import { isStepCount, Output, ToolLoopAgent } from "ai";
import { z } from "zod";
import { MODEL } from "../model";
import { searchTalks, getSpeaker, bookSeat } from "./tools";
import { INSTRUCTIONS } from "./instructions";
import { tokenBudget } from "./limits";
import { research } from "./research";
import { AnswerSchema } from "./data";

export const MAX_STEPS = 10;
export const TOKEN_BUDGET = 20_000;

// Exported so the CLI can validate what the user typed with the same schema
export const callOptionsSchema = z.object({
  attendeeName: z.string().min(1),
  ticketType: z.enum(["general", "vip"]),
});

export const conferenceAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: INSTRUCTIONS,
  tools: { searchTalks, getSpeaker, bookSeat, research },
  toolsContext: {
    // Keyed by tool name. Typed by bookSeat's contextSchema.
    bookSeat: {
      dbUrl: process.env.BOOKINGS_DB_URL ?? "postgres://localhost/fake-db-01",
      apiKey: process.env.BOOKINGS_API_KEY ?? "sk-demo-123456",
    },
  },
  callOptionsSchema,
  prepareCall: ({ options, ...settings }) => ({
    ...settings, // ⚠️ always spread, or you lose model/tools/instructions
    instructions:
      settings.instructions +
      `\n\nCurrent attendee: ${options.attendeeName} (${options.ticketType} ticket).` +
      `\nGreet them by name in your first reply.`,
    toolApproval: {
      bookSeat: () =>
        options.ticketType === "vip" ? "approved" : "user-approval",
    },
  }),
  stopWhen: [isStepCount(MAX_STEPS), tokenBudget(TOKEN_BUDGET)],
  prepareStep: async ({ stepNumber }) => {
    if (stepNumber === 0) {
      // bookSeat is left out, so the model can't even see it on the first step
      const activeTools = ["searchTalks", "getSpeaker", "research"] as const;
      console.log(`  · step 0 → tools allowed: ${activeTools.join(", ")}`);
      return { activeTools: [...activeTools] };
    }

    return {}; // sept 1+: all tools, as configured
  },
  onStepEnd: ({ stepNumber, usage }) => {
    console.log(`  [agent] step ${stepNumber}: ${usage.totalTokens} tokens`);
  },
  output: Output.object({ schema: AnswerSchema }),
});
