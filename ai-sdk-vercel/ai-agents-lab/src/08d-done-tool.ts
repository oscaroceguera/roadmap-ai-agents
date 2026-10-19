import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  toolChoice: "required", // must call a tool every step
  tools: {
    weather,
    convertFahrenheitToCelsius,
    done: tool({
      description: "Call when you have the final answer",
      inputSchema: z.object({ answer: z.string() }),
      // no execute → calling it stops the loop
    }),
  },
});

const r = await agent.generate({ prompt: "Weather in Tijuana in celsius?" });

const call = r.staticToolCalls[0]; // tool calls from the final step that weren't executed
if (call?.toolName === "done") console.log("ANSWER:", call.input.answer);
console.log("steps:", r.steps.length, "| text:", JSON.stringify(r.text));
