import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import matter from "gray-matter";
import { EXCLUDE_DIRS, EXCLUDE_FILES, SOURCES } from "./config";

export type NoteFile = {
  path: string;
  title: string;
  body: string;
  raw: string;
};

/** One exclusion rule for the walker AND the grep baseline, so both see the same vault. */
export const isExcluded = (rel: string) =>
  EXCLUDE_FILES.has(rel) ||
  rel.split("/").some((seg) => seg.startsWith(".") || EXCLUDE_DIRS.has(seg));

async function* walk(root: string, dir = root): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(root, full);
    else if (entry.name.endsWith(".md")) yield relative(root, full);
  }
}

const stripFrontmatter = (raw: string) => {
  try {
    return matter(raw).content;
  } catch {
    return raw; // broken YAML: index the whole file rather than drop it
  }
};

export async function* walkSources(): AsyncGenerator<NoteFile> {
  for (const { root, prefix } of SOURCES) {
    for await (const rel of walk(root)) {
      const path = prefix + rel;
      if (isExcluded(path)) continue;
      const raw = await readFile(join(root, rel), "utf8");
      yield {
        path,
        title: basename(rel, ".md"),
        body: stripFrontmatter(raw),
        raw,
      };
    }
  }
}
