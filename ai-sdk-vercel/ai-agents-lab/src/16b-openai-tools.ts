import { ToolLoopAgent } from "ai";
import { openai } from "@ai-sdk/openai";
import { MODEL } from "./model";
import { convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: {
    web_search: openai.tools.webSearch({ searchContextSize: "low" }),
    convertFahrenheitToCelsius,
  },
});

const r = await agent.generate({
  prompt:
    "Find the current temperature in Culiacán, Sinaloa and give it to me in Celsius.",
});

console.log(r.text);
console.log(
  "sources:",
  r.sources.map((s) => (s.sourceType === "url" ? s.url : s.title)),
);
console.log(
  "tools:",
  r.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)),
);
