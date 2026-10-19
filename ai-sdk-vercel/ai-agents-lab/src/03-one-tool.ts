import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";
import { weather } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather },
});

const result = await agent.generate({
  prompt: "What's the weather in Guadalajara?",
});

console.log("\nFINAL:", result.text);

result.steps.forEach((step, i) => {
  console.log(`\n--- step ${i} (finishReason: ${step.finishReason})`);
  console.log(
    "toolCalls",
    step.toolCalls.map((c) => ({ name: c.toolName, input: c.input })),
  );
  console.log(
    "toolResults:",
    step.toolResults.map((r) => r.output),
  );
  console.log("text           :", step.text);
});
