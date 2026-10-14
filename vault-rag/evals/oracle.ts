import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { VAULT_PATH } from "../src/config";
import { grepSearch } from "../src/search/grep";

export type Doc = { path: string; text: string };

/** The expected note(s) + the top grep hits that AREN'T the answer: realistic distractors. */
export async function oracleDocs(
  q: { question: string; expect: string[] },
  distractors = 2,
): Promise<Doc[]> {
  const others = grepSearch(q.question)
    .map((h) => h.path)
    .filter((p) => !q.expect.includes(p))
    .slice(0, distractors);

  const paths = [...others.slice(0, 1), ...q.expect, ...others.slice(1)]; // answer in the middle, never firts
  return Promise.all(
    paths.map(async (path) => ({
      path,
      text: await readFile(join(VAULT_PATH, path), "utf8"),
    })),
  );
}
