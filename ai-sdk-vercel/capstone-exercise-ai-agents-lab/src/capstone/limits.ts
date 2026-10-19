import type { StopCondition, ToolSet } from "ai";
import { number } from "zod";

export const tokenBudget =
  <TOOLS extends ToolSet>(max: number): StopCondition<TOOLS> =>
  ({ steps }) =>
    steps.reduce((sum, s) => sum + (s.usage?.totalTokens ?? 0), 0) > max;
