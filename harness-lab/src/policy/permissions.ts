import { z } from "zod";

export const DecisionSchema = z.enum(["allow", "ask", "deny"]);
export type Decision = z.infer<typeof DecisionSchema>;

export const RuleSchema = z.object({
  tool: z.string(), // exact name or "*"
  path: z.string().optional(), // glob on input.path, e.g. "src/**", "**/.env*"
  decision: DecisionSchema,
});
export type Rule = z.infer<typeof RuleSchema>;
export const PolicySchema = z.object({
  rules: z.array(RuleSchema),
  default: DecisionSchema.default("ask"),
});
export type Policy = z.infer<typeof PolicySchema>;

/** Minimal glob: ** = any dirs, * = any chars except '/', ? = one char. */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*" && glob[i + 1] === "*") {
      re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
      i += glob[i + 2] === "/" ? 2 : 1;
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function inputPath(input: unknown): string | undefined {
  const r = z.object({ path: z.string() }).safeParse(input);
  return r.success ? r.data.path.replace(/^\.\//, "") : undefined;
}

/** First matching rule wins; order rules from most specific (deny) to least. */
export function evaluate(
  policy: Policy,
  toolName: string,
  input: unknown,
): Decision {
  const p = inputPath(input);
  for (const rule of policy.rules) {
    if (rule.tool !== "*" && rule.tool !== toolName) continue;
    if (
      rule.path !== undefined &&
      (p === undefined || !globToRegExp(rule.path).test(p))
    )
      continue;
    return rule.decision;
  }
  return policy.default;
}

export const defaultPolicy: Policy = PolicySchema.parse({
  rules: [
    { tool: "*", path: "**/.env*", decision: "deny" },
    { tool: "*", path: ".git/**", decision: "deny" },
    { tool: "read_file", decision: "allow" },
    { tool: "list_files", decision: "allow" },
    { tool: "run_tests", decision: "allow" },
    { tool: "write_file", path: "src/**", decision: "allow" },
    { tool: "write_file", path: "test/**", decision: "allow" },
  ],
  default: "ask",
});
