import * as fs from "node:fs";
import * as path from "node:path";
import { openai } from "@ai-sdk/openai";
import { generateText, isLoopFinished, tool, zodSchema } from "ai";
import { spawnSync } from "child_process";
import { z } from "zod";
import { MODEL_NAME, WORKDIR } from "./config.ts";
import { SkillLoader } from "./skills.ts";
import { TaskManager } from "./task.ts";
import { TodoManager } from "./todo.ts";

const TODO = new TodoManager();
const TASK = new TaskManager();
const SKILLS = new SkillLoader();

export const SKILL_DESCRIPTIONS = SKILLS.getDescriptions();

/** CONSTANTS */
const BLOCKED_COMMANDS = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"];

const safePath = (p: string) => {
  const resolved = path.resolve(WORKDIR, p);
  if (!resolved.startsWith(WORKDIR)) {
    throw new Error(`Path is not in ${WORKDIR}`);
  }

  return resolved;
};

// TOOLS
const runBash = (command: string): string => {
  if (BLOCKED_COMMANDS.some((c) => command.includes(c))) {
    return "Error: Danger Oscar Oceguera!!!";
  }

  try {
    const result = spawnSync("sh", ["-c", command], {
      cwd: WORKDIR,
      encoding: "utf8",
      timeout: 120000,
    });

    return (result.stdout + result.stderr).trim().slice(0, 50000) || "";
  } catch (error) {
    return `Error ${error}`;
  }
};

const runRead = (filePath: string, limit?: number) => {
  try {
    const fp = safePath(filePath);
    const lines = fs.readFileSync(fp, "utf8").split("\n");

    return (limit ? lines.slice(0, limit) : lines).join("\n").slice(0, 50000);
  } catch (e) {
    return `Error ${e}`;
  }
};

const runWrite = (filePath: string, content: string) => {
  try {
    const fp = safePath(filePath);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, content);

    return `Wrote the file: ${fp}`;
  } catch (e) {
    return `Error ${e}`;
  }
};

const runEdit = (filePath: string, oldText: string, newText: string) => {
  try {
    const fp = safePath(filePath);

    const content = fs.readFileSync(fp, "utf8");
    if (!content.includes(oldText)) {
      return `Error: ${oldText} not found in ${fp}`;
    }

    fs.writeFileSync(fp, content.replaceAll(oldText, newText));

    return `Edit the file: ${fp}`;
  } catch (e) {
    return `Error ${e}`;
  }
};

export const TOOLS = {
  bash: tool({
    description: "Run a shell command",
    inputSchema: zodSchema(
      z.object({
        command: z.string(),
      }),
    ),
    execute: async ({ command }: { command: string }) => {
      const output = runBash(command);
      return output;
    },
  }),
  read_file: tool({
    description: "Read a file",
    inputSchema: zodSchema(
      z.object({
        filePath: z.string(),
        limit: z.number().optional(),
      }),
    ),
    execute: async ({ filePath, limit }) => runRead(filePath, limit),
  }),
  write_file: tool({
    description: "Write a file",
    inputSchema: zodSchema(
      z.object({
        filePath: z.string(),
        content: z.string(),
      }),
    ),
    execute: async ({ filePath, content }) => runWrite(filePath, content),
  }),
  edit_file: tool({
    description: "Edit a file",
    inputSchema: zodSchema(
      z.object({
        filePath: z.string(),
        oldText: z.string(),
        newText: z.string(),
      }),
    ),
    execute: async ({ filePath, oldText, newText }) =>
      runEdit(filePath, oldText, newText),
  }),
  todo: tool({
    description: "Update task list. Track progress on multi-step tasks.",
    inputSchema: zodSchema(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            status: z.enum(["pending", "in_progress", "completed"]),
          }),
        ),
      }),
    ),
    execute: async ({ items }) => {
      const output = TODO.update(items);
      console.log(`> todo:\n${output}`);
      return output;
    },
  }),
  task_create: tool({
    description: "Create a new task.",
    inputSchema: zodSchema(
      z.object({ subject: z.string(), description: z.string().optional() }),
    ),
    execute: async ({ subject, description }) =>
      TASK.create(subject, description),
  }),
  task_update: tool({
    description: "Update a task.",
    inputSchema: zodSchema(
      z.object({
        task_id: z.number(),
        status: z.enum(["pending", "in_progress", "completed"]).optional(),
        addBlockedBy: z.array(z.number()).optional(),
        removeBlockedBy: z.array(z.number()).optional(),
      }),
    ),
    execute: async ({ task_id, status, addBlockedBy, removeBlockedBy }) =>
      TASK.update(task_id, status, addBlockedBy, removeBlockedBy),
  }),
  task_list: tool({
    description: "List all tasks.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => TASK.list(),
  }),
  task_get: tool({
    description: "Get a task by id.",
    inputSchema: zodSchema(z.object({ task_id: z.number() })),
    execute: async ({ task_id }) => TASK.get(task_id),
  }),
  skill_get: tool({
    description: "Load specialized knowledge bt name",
    inputSchema: zodSchema(z.object({ name: z.string() })),
    execute: async ({ name }) => SKILLS.getContent(name),
  }),
};

const runSubagent = async (prompt: string): Promise<string> => {
  const { text } = await generateText({
    model: openai(MODEL_NAME),
    system: `You are a codding subagents at ${WORKDIR}. Complete your given task, then summarizee your findings.`,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    tools: TOOLS,
    stopWhen: isLoopFinished(),
  });

  return text;
};

export const PARENT_TOOLS = {
  ...TOOLS,
  task: tool({
    description:
      "Spawn a subagent with fresh context, it shares the file system, but not the conversation history",
    inputSchema: zodSchema(
      z.object({
        task: z.string(),
      }),
    ),
    execute: async ({ task }) => await runSubagent(task),
  }),
};
