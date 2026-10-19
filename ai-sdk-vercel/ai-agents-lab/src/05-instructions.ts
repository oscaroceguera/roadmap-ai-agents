import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
  instructions: `You are a travel weather assistant for Mexico.

Rules:
- ALWAYS report temperatures in Celsius. Use the conversion tool; never do the math yourself.
- If the user doesn't name a city, ask for one. Do not guess.
- Answer in the same language the user writes in.

Format:
- One line per city: "<City>: <N>°C — <one-word vibe>"`,
});

for (const prompt of ["Clima en Culiacán y Monterrey", "It is hot?"]) {
  const r = await agent.generate({ prompt });
  console.log(`\n> ${prompt}\n${r.text}`);
}
