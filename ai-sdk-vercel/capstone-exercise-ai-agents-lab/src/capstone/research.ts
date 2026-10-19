import { ToolLoopAgent, isStepCount, tool } from "ai";
import { z } from "zod";
import { MODEL } from "../model";
import { searchTalks, getSpeaker } from "./tools";

const researchSubagent = new ToolLoopAgent({
  model: MODEL,
  instructions: `You research the JSConf México 2026 talk catalog for another agent.
Search with several short keywords (tracks, topics, levels) to cover the request.
When finished, write a short summary: for each relevant talk give its id, title, track,
level and one line on why it fits. Only include talks that searchTalks returned.`,
  tools: { searchTalks, getSpeaker }, // read-only. No bookSeat: subagent tools can't use approvals
  stopWhen: isStepCount(6),
});

export const research = tool({
  description:
    'Research the talk catalog in depth for open questions like "recommend me talks" or ' +
    '"what fits a backend dev". Returns a summary of matching talks with their ids.',
  inputSchema: z.object({
    task: z
      .string()
      .describe("What to research, including what the attendee likes"),
  }),
  execute: async ({ task }, { abortSignal }) => {
    console.log(`    [main] delegating: ${task}`);
    const r = await researchSubagent.generate({ prompt: task, abortSignal });
    console.log(
      `    [main] subagent used ${r.steps.length} steps, ${r.usage.totalTokens} tokens`,
    );
    return r.text; // only the summary goes back to the main agent
  },
});
