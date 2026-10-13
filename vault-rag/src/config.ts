const must = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};

export const VAULT_PATH = must("VAULT_PATH");
export const CHUNKER = (process.env.CHUNKER ?? "heading") as
  "fixed" | "heading";

/** Bump the suffix whenever you change a chunker: it's in the hash, so every note re-embeds. */
export const CHUNKER_VERSION = `${CHUNKER}-v1`;

export const SOURCES = [{ root: VAULT_PATH, prefix: "" }];

export const EXCLUDE_DIRS = new Set([
  ".obsidian",
  ".git",
  ".trash",
  ".claudian",
  "node_modules",
  "Attachments",
  "Templates",
  "06 Personal", // privacy: change on purpose
]);

export const EXCLUDE_FILES = new Set([
  "05 Planning/vault-rag Guide.md", // these two talk about the eval questions
  "05 Planning/Phase 4 Labs.md",
]);
