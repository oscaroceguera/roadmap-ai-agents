#!/usr/bin/env bash
# PostToolUse: corre los sensores. Exit 2 => Claude Code le muestra stderr al agente.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! out=$(pnpm -s check 2>&1); then
  echo "pnpm check FALLÓ. Corrige esto antes de seguir:" >&2
  echo "$out" | tail -n 40 >&2
  exit 2
fi
exit 0