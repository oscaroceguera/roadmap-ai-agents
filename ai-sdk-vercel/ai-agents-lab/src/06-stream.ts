import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
});

const result = await agent.stream({
  prompt: "Weather in Oaxaca in celsius, then write a 4-line poem about it.",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
console.log("\n\n[done]");
