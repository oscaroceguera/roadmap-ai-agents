import fs from "node:fs/promises";
import nodePath from "node:path";
import { resolveInWorkspace } from "../workspace";
import type { ToolOutput } from "./run";

export async function writeFile({
  path,
  content,
}: {
  path: string;
  content: string;
}): Promise<ToolOutput> {
  const abs = resolveInWorkspace(path);
  await fs.mkdir(nodePath.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
  return { ok: true, path, bytes: Buffer.byteLength(content) };
}
