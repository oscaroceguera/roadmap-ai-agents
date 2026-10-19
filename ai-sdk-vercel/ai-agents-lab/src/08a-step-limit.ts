import { ToolLoopAgent, isStepCount } from "ai";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
  stopWhen: isStepCount(1),
});

const r = await agent.generate({ prompt: "Weather in Mérida in celsius?" });
console.log("steps:", r.steps.length);
console.log("text :", JSON.stringify(r.text));
console.log("last finishReason:", r.steps.at(-1)?.finishReason);
