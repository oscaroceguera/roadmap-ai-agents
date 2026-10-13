import { execFileSync } from "node:child_process";
import { relative } from "node:path";
import { VAULT_PATH } from "../config";
import { isExcluded } from "../vault";
import { keywords } from "./keywords";
import type { NoteHit } from "./types";

export function grepSearch(question: string, k = 10): NoteHit[] {
  const counts = new Map<string, number>();
  for (const term of keywords(question)) {
    let out = "";
    try {
      out = execFileSync(
        "rg",
        ["-l", "-i", "-F", "--glob", "*.md", term, VAULT_PATH],
        { encoding: "utf8" },
      );
    } catch {
      continue; // rg exits 1 when nothing matches
    }
    for (const file of out.split("\n").filter(Boolean)) {
      const path = relative(VAULT_PATH, file);
      if (isExcluded(path)) continue;
      counts.set(path, (counts.get(path) ?? 0) + 1);
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([path]) => ({ path }));
}
