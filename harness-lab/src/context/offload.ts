import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface OffloadOptions {
  thresholdChars: number;
  dir: string; // absolute; usually <workspace>/.harness/outputs
  previewChars?: number;
}

/** Big outputs go to a file; the model gets a preview + a path it can read_file later. */
export async function offloadIfLarge(
  id: string,
  output: string,
  opts: OffloadOptions,
  workspaceRoot: string,
): Promise<string> {
  if (output.length <= opts.thresholdChars) return output;
  await mkdir(opts.dir, { recursive: true });
  const file = path.join(opts.dir, `${id.replace(/[^\w-]/g, "_")}.txt`);
  await writeFile(file, output, "utf8");
  const ref = path.relative(workspaceRoot, file);
  const preview = output.slice(0, opts.previewChars ?? 500);
  return `${preview}\n…[truncated ${output.length - preview.length} chars; full output saved to ${ref} — use read_file to see it]`;
}
