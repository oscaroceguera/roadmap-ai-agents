export type Decision = "allow" | "ask" | "deny";

const SAFE_BASH = [
  /^npx vitest run( [\w./-]+)*$/,
  /^npx tsc --noEmit$/,
  /^git (status|diff)( [\w./-]+)*$/,
  /^ls( -[a-z]+)?( [\w./-]+)*$/,
];

export function policy(
  call: { toolName: string; input: any },
  session: { autoApproveWrites: boolean },
): Decision {
  switch (call.toolName) {
    case "read_file":
    case "grep":
      return "allow";
    case "write_file":
      return session.autoApproveWrites ? "allow" : "ask";
    case "bash": {
      const cmd = String(call.input.command).trim();
      if (/[;&|`$<>\\\n(]/.test(cmd)) return "ask"; // chaining, subshells, redirects, NEWLINES → a human looks
      return SAFE_BASH.some((r) => r.test(cmd)) ? "allow" : "ask";
    }
    default:
      return "deny";
  }
}
