import { ModelMessage, streamText, tool, isStepCount } from "ai";
import { openai } from "@ai-sdk/openai";
import "dotenv/config";
import { z } from "zod";
import * as readline from "node:readline/promises";

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const messages: ModelMessage[] = [];

async function main() {
  while (true) {
    const userInput = await terminal.question("You: ");

    messages.push({ role: "user", content: userInput });

    const result = streamText({
      model: openai("gpt-5.6-luna"),
      messages,
      tools: {
        weather: tool({
          description: "Get the weather in a location (fahrenheit)",
          inputSchema: z.object({
            location: z
              .string()
              .describe("The location to get the weather for"),
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
      stopWhen: isStepCount(5),
      onStepEnd: async ({ toolResults }) => {
        if (toolResults.length) {
          console.log(JSON.stringify(toolResults, null, 2));
        }
      },
    });

    let fullResponse = "";
    process.stdout.write("\nAssistant: ");
    for await (const delta of result.textStream) {
      fullResponse += delta;
      process.stdout.write(delta);
    }

    process.stdout.write("\n\n");

    console.log(await result.toolCalls);
    console.log(await result.toolResults);
    messages.push({ role: "assistant", content: fullResponse });
  }
}

main().catch(console.error);
