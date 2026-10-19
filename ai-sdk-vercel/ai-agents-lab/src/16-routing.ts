import { generateText, Output } from "ai";
import { z } from "zod";
import { MODEL } from "./model";

async function handleQuery(query: string) {
  const { output: c } = await generateText({
    model: MODEL,
    output: Output.object({
      schema: z.object({
        type: z.enum(["tickets", "agenda", "other"]),
        reasoning: z.string(),
      }),
    }),
    prompt: `Classify this attendee query: ${query}`,
  });

  const { text } = await generateText({
    model: MODEL,
    instructions: {
      tickets: "You handle ticket purchases, refunds and transfers.",
      agenda: "You answer questions about talks, speakers and schedule.",
      other: "You are a general conference helper.",
    }[c.type],
    prompt: query,
  });

  return { route: c.type, text };
}

console.log(await handleQuery("Can I transfer my ticket to a friend?"));
console.log(await handleQuery("What time is the keynote?"));
