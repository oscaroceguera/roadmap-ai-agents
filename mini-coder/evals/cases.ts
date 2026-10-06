export type Call = {
  toolName: string;
  input: any;
};

export type SingleTurnCase = {
  name: string;
  prompt: string;
  expect: (calls: Call[]) => boolean;
};

export const singleTurn: SingleTurnCase[] = [
  {
    name: "find-definition",
    prompt: "Where is formatCents defined?",
    expect: (calls) => calls[0]?.toolName === "grep",
  },
  {
    name: "read-known-file",
    prompt: "Show me src/money.ts",
    expect: (calls) =>
      calls[0]?.toolName === "read_file" &&
      calls[0].input.path.endsWith("money.ts"),
  },
  {
    name: "run-tests",
    prompt: "Are the test passing?",
    expect: (calls) =>
      calls[0]?.toolName === "bash" && /vitest/.test(calls[0].input.command),
  },
  {
    name: "write-asked",
    prompt: "Create NOTES.md saying 'hello'",
    expect: (calls) => calls[0]?.toolName === "write_file",
  },
  {
    name: "ask-dont-act",
    prompt: "Clean up the repo.",
    expect: (calls) => calls.length === 0,
  },
];
