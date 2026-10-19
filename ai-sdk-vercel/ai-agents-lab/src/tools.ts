import { tool } from "ai";
import { z } from "zod";

export const weather = tool({
  description: "Get the weather in a location (in Farenheit)",
  inputSchema: z.object({
    location: z.string().describe("The loaction to get the weather for"),
  }),
  execute: async ({ location }) => {
    console.log(` 🔧 weather(${location})`);
    return {
      location,
      temperature: 72 + Math.floor(Math.random() * 21) - 10,
    };
  },
});

export const convertFahrenheitToCelsius = tool({
  description: "Convert temperature from Fahrenheit to Celsius",
  inputSchema: z.object({
    temperature: z.number().describe("Temperature in Fahrenheit"),
  }),
  execute: async ({ temperature }) => {
    console.log(` 🔧 convert(${temperature})`);
    return {
      celsius: Math.round((temperature - 32) * (5 / 9)),
    };
  },
});
