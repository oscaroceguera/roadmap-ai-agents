import { ToolLoopAgent } from "ai";
import { MODEL } from "./model";
import { weather, convertFahrenheitToCelsius } from "./tools";

const agent = new ToolLoopAgent({
  model: MODEL,
  tools: { weather, convertFahrenheitToCelsius },
  // Agent-wide callback (runs on every call)
  onStepEnd: ({ stepNumber, usage }) => {
    console.log(`[agent] step ${stepNumber}: ${usage.totalTokens} tokens`);
  },
});

const t0 = Date.now();

await agent.generate({
  prompt: "Weather in Puebla in celsius?",
  // Once, before any model call
  onStart({ modelId }) {
    console.log("▶ start", modelId);
  },
  // Before each model call
  onStepStart({ stepNumber }) {
    console.log(`  · step ${stepNumber} starting`);
  },
  // Right before a tool's execute
  onToolExecutionStart({ toolCall }) {
    console.log(`    ↳ tool start: ${toolCall.toolName}`, toolCall.input);
  },
  // After execute (result or error)
  onToolExecutionEnd({ toolCall, toolExecutionMs, toolOutput }) {
    console.log(
      `    ↳ tool end: ${toolCall.toolName} (${toolExecutionMs}ms)`,
      toolOutput.type === "tool-result" ? toolOutput.output : toolOutput.error,
    );
  },
  // After each step (usage, finish reason)
  onStepEnd({ stepNumber, finishReason, toolCalls }) {
    console.log(
      `  · step ${stepNumber} end: ${finishReason}`,
      toolCalls?.map((t) => t.toolName),
    );
  },
  // When the whole run finishes
  onEnd({ steps, usage }) {
    console.log(
      `■ end: ${steps.length} steps, ${usage.totalTokens} tokens, ${Date.now() - t0}ms`,
    );
  },
});
