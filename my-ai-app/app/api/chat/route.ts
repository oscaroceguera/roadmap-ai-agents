import {
  streamText,
  UIMessage,
  convertToModelMessages,
  tool,
  createUIMessageStreamResponse,
  toUIMessageStream,
  isStepCount,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { agentConfig } from "@/agent/agent";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const resutl = streamText({
    model: openai(agentConfig.model),
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    providerOptions: agentConfig.providerOptions,
    tools: {
      weather: tool({
        description: "Get the weather in location (fahrenheit)",
        inputSchema: z.object({
          location: z.string().describe("The locatio for"),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
      convertFahrenheitToCelsius: tool({
        description: "Convert a temperature in fahrenheit to celsius",
        inputSchema: z.object({
          temperature: z
            .number()
            .describe("The temperature in fahrenheit to convert"),
        }),
        execute: async ({ temperature }) => {
          const celsius = Math.round((temperature - 32) * (5 / 9));
          return {
            celsius,
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: resutl.stream }),
  });
}
