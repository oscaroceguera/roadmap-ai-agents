export type ToolOutput =
  | { ok: true; [k: string]: unknown }
  | { ok: false; error: string; [k: string]: unknown };
