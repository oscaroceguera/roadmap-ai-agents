import { ToolLoopAgent, Output } from "ai";
import { z } from "zod";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
  output: Output.object({
    schema: z.object({
      cities: z.array(
        z.object({
          name: z.string(),
          celsius: z.number(),
          recommendation: z.enum(["go outside", "stay in"]),
        }),
      ),
    }),
  }),
});

const { output } = await agent.generate({
  prompt: "Compare weather in Querétaro and Mazatlán.",
});

console.log(output);
console.log("first city:", output.cities[0].name); // fully typed
