#!/usr/bin/env node

import "dotenv/config";
import { openai } from "@ai-sdk/openai";

import { generateText, isLoopFinished, type ModelMessage } from "ai";
import { estimateTokens } from "./compact.ts";
import { MODEL_NAME, WORKDIR } from "./config.ts";
import { PARENT_TOOLS, SKILL_DESCRIPTIONS } from "./tools.ts";
import { AgentUI } from "./ui.ts";

// AGENT LOOP
const agentLoop = async (
  messages: ModelMessage[],
  ui: AgentUI,
): Promise<string> => {
  console.log(`token count: ${estimateTokens(messages)}`);

  let stepsSinceTodo = 0;
  const { text } = await generateText({
    model: openai(MODEL_NAME),
    system: `You are a coding agent at $(WORKDIR}.
        Prefer task_create/task_update/task_list for multi-step work.
        Use todo for short checklists.
        Use the task tool to delegate exploration or subtasks.
        Use skill_get for specialized knowledge.
        Skills: ${SKILL_DESCRIPTIONS}'`,
    messages,
    tools: PARENT_TOOLS,
    stopWhen: isLoopFinished(),
    onStepFinish: ({ toolCalls, toolResults }) => {
      const usedTodo = toolCalls.some((tc) => tc.toolName === "todo") ?? false;
      stepsSinceTodo = usedTodo ? 0 : stepsSinceTodo + 1;

      if (stepsSinceTodo >= 3) {
        messages.push({
          role: "user",
          content: "<reminder>Update your todos.</reminder>",
        });
      }

      const tc = toolCalls[0];
      if (tc) {
        const args = JSON.stringify(tc.input).slice(0, 60);
        const out = toolResults[0]?.output;
        const result = out
          ? typeof out === "string" && out.startsWith("Error")
            ? `🔴 ${out.slice(0, 50)}`
            : "🟢"
          : "";
        ui.setActionStatus(`${tc.toolName}: ${args} ${result}`);
      }
    },
  });
  return text;
};

// INTERFACE
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// const history: ModelMessage[] = [];

// const prompt = (): void => {
//   rl.question("[input] >> ", async (query) => {
//     history.push({ role: "user", content: query });
//     const reply = await agentLoop(history);
//     history.push({ role: "assistant", content: reply });

//     if (reply) console.log(reply);
//     console.log();
//     prompt();
//   });
// };

// prompt();

const history: ModelMessage[] = [];
const ui = new AgentUI(history);

ui.onInput = async (query) => {
  ui.push({ role: "user", content: query });
  const reply = await ui.think(() => agentLoop(history, ui));
  if (reply) {
    ui.push({ role: "assistant", content: reply });
  }
};

ui.start();
