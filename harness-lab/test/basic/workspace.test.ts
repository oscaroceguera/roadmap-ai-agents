import { describe, expect, it } from "vitest";
import {
  resolveInWorkspace,
  WorkspaceError,
} from "../../src/core/workspace.js";

describe("resolveInWorkspace", () => {
  it("resolves paths inside the root", () => {
    expect(resolveInWorkspace("/ws", "src/a.ts")).toBe("/ws/src/a.ts");
  });
  it.each(["../etc/passwd", "/etc/passwd", "src/../../x"])(
    "rejects %s",
    (p) => {
      expect(() => resolveInWorkspace("/ws", p)).toThrow(WorkspaceError);
    },
  );
});
