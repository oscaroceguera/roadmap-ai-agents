import path from "node:path";

export class WorkspaceError extends Error {
  override name = "WorkspaceError";
}

/** Resolve a user/model-supplied path and refuse anything outside the workspace root. */
export function resolveInWorkspace(root: string, relative: string): string {
  const absRoot = path.resolve(root);
  const target = path.resolve(absRoot, relative);
  const rel = path.relative(absRoot, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new WorkspaceError(`Path escapes workspace: ${relative}`);
  }
  return target;
}
