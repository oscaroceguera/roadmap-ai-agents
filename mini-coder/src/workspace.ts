import fs from "node:fs";
import path from "node:path";

// realpath at startup: on macOS /tmp is really /private/tmp, and a lexical ROOT
// would make every realpath check below fail.
export const ROOT = fs.realpathSync(path.resolve(process.env.WORKSPACE ?? "."));

function inside(root: string, p: string) {
  const rel = path.relative(root, p);
  return (
    rel === "" ||
    (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel))
  );
}

export function resolveInWorkspace(p: string): string {
  const abs = path.resolve(ROOT, p);
  if (!inside(ROOT, abs))
    throw new Error(`Refused: ${p} is outside the workspace`);
  // Symlink escape: if the target exists, its real location must also be inside.
  if (fs.existsSync(abs) && !inside(ROOT, fs.realpathSync(abs))) {
    throw new Error(`Refused: ${p} resolves outside the workspace`);
  }
  return abs;
}

// Clip big outputs at the source. This is the cheapest context defense there is.
export function clip(s: string, max = 8_000) {
  if (s.length <= max) return s;
  const half = max / 2;
  return `${s.slice(0, half)}\n…[${s.length - max} chars clipped — use grep or read a smaller file]…\n${s.slice(-half)}`;
}
