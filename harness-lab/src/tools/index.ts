import { ToolRegistry } from "./registry.js";
import { listFilesTool, readFileTool, writeFileTool } from "./fs-tools.js";
import { runTestsTool } from "./run-tests.js";

export function defaultTools(): ToolRegistry {
  return new ToolRegistry([
    readFileTool,
    writeFileTool,
    listFilesTool,
    runTestsTool,
  ]);
}
