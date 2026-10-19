// src/09-prepare-step.ts
import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
  prepareStep: async ({ stepNumber, steps }) => {
    console.log(`prepareStep #${stepNumber}, prior steps: ${steps.length}`);

    if (stepNumber === 0) {
      // Phase 1: force fetching data
      return {
        activeTools: ["weather"],
        toolChoice: { type: "tool", toolName: "weather" },
      };
    }
    if (stepNumber === 1) {
      // Phase 2: only conversion is allowed
      return { activeTools: ["convertFahrenheitToCelsius"] };
    }
    // Phase 3: no tools, just write the answer with minimal reasoning
    // (GPT-6 ignores temperature — use `reasoning` for per-step tuning)
    return { activeTools: [], reasoning: "low" };
  },
});

const r = await agent.generate({
  prompt: "How is Cancún today? Celsius please.",
});
console.log(r.steps.map((s) => s.toolCalls.map((c) => c.toolName)));
console.log(r.text);
