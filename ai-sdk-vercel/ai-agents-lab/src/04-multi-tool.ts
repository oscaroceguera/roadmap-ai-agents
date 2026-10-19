import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
});

const result = await agent.generate({
  prompt: "What is the weather in Mexico City in celsius?",
});

console.log("\nFINAL:", result.text);
console.log(
  "TOOL SEQUENCE:",
  result.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)),
);
