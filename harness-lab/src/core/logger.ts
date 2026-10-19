export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Logger {
  log(level: LogLevel, event: string, fields?: LogFields): void;
}

/** One JSON object per line on stderr: greppable, pipeable to jq, never mixed with stdout. */
export function jsonLogger(
  write: (line: string) => void = (l) => process.stderr.write(l + "\n"),
): Logger {
  return {
    log(level, event, fields = {}) {
      write(
        JSON.stringify({
          ts: new Date().toISOString(),
          level,
          event,
          ...fields,
        }),
      );
    },
  };
}

/** Collects entries in memory; perfect for asserting in tests. */
export function memoryLogger(): Logger & {
  entries: { level: LogLevel; event: string; fields: LogFields }[];
} {
  const entries: { level: LogLevel; event: string; fields: LogFields }[] = [];
  return {
    entries,
    log: (level, event, fields = {}) => entries.push({ level, event, fields }),
  };
}

export const silentLogger: Logger = { log: () => {} };
