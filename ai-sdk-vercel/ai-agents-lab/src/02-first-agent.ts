import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";

const agent = new ToolLoopAgent({
  model: MODEL,
  instructions: "You are a concise assistant. Answer in one sentence.",
});

const result = await agent.generate({
  prompt: "What is a JavaScript closure?",
});

console.log("TEXT:", result.text);
console.log("STEPS:", result.steps.length);
console.log("USAGE:", result.usage);
