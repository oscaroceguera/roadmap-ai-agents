import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** Fresh temp workspace seeded with files: { "a.txt": "hi" }. */
export async function tmpWorkspace(
  files: Record<string, string> = {},
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "harness-"));
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), content);
  }
  return root;
}
