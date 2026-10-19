import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { MODEL } from "./model";

// Fake "big" data source
const TALKS = [
  { id: 1, title: "Signals in React", track: "frontend", level: "advanced" },
  { id: 2, title: "Node streams 101", track: "backend", level: "beginner" },
  {
    id: 3,
    title: "Agents with the AI SDK",
    track: "ai",
    level: "intermediate",
  },
  {
    id: 4,
    title: "Edge runtimes deep dive",
    track: "backend",
    level: "advanced",
  },
];

const researchSubagent = new ToolLoopAgent({
  model: MODEL,
  instructions: `You are a research agent for a conference catalog.
When finished, write a clear summary of your findings as your final response.
That summary is returned to another agent, so include all relevant info.`,
  tools: {
    searchTalks: tool({
      description: "Search talks by keyword in title or track",
      inputSchema: z.object({ q: z.string() }),
      execute: async ({ q }) => {
        console.log(`    [sub] searchTalks(${q})`);
        return TALKS.filter((t) =>
          (t.title + t.track).toLowerCase().includes(q.toLowerCase()),
        );
      },
    }),
  },
});

const research = tool({
  description: "Research the talk catalog in depth and return a summary.",
  inputSchema: z.object({ task: z.string().describe("What to research") }),
  execute: async ({ task }, { abortSignal }) => {
    console.log(`  [main] delegating: ${task}`);
    const r = await researchSubagent.generate({ prompt: task, abortSignal });
    console.log(`  [main] subagent used ${r.steps.length} steps`);
    return r.text; // only the summary reaches the main agent
  },
});

const mainAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: "You help attendees plan their day. Delegate catalog research.",
  tools: { research },
});

const r = await mainAgent.generate({
  prompt: "I am a backend dev. Which talks should I attend?",
});
console.log("\n", r.text);
