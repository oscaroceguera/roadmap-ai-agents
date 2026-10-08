// evals/bigFiles.ts — writes big/file-01.md … big/file-10.md (~7,000 chars each, under clip()'s 8,000).
// A fact is planted in file-01; file-10 has a distinctive title. Answering needs BOTH ends of a long run.
//   pnpm exec tsx evals/bigFiles.ts /tmp/mc-scratch    → writes /tmp/mc-scratch/big/
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const PLANTED_FACT = "TANGERINE-7741";
export const LAST_TITLE = "Lighthouse Maintenance Schedule";

const TOPICS = [
  "Billing",
  "Shipping",
  "Returns",
  "Inventory",
  "Payroll",
  "Support",
  "Taxes",
  "Suppliers",
  "Security",
  LAST_TITLE,
];

export function writeBigFiles(root: string) {
  const dir = path.join(root, "big");
  mkdirSync(dir, { recursive: true });
  TOPICS.forEach((topic, i) => {
    const n = String(i + 1).padStart(2, "0");
    const lines = [`# ${topic}`, ""];
    if (i === 0)
      lines.push(
        `The project codename is ${PLANTED_FACT}. Keep it in mind.`,
        "",
      );
    for (let p = 0; lines.join("\n").length < 7_000; p++) {
      lines.push(
        `Paragraph ${p + 1} of the ${topic.toLowerCase()} notes: routine details about process step ${p + 1}, owners, dates and follow-ups that matter to nobody in this task.`,
      );
    }
    writeFileSync(path.join(dir, `file-${n}.md`), lines.join("\n"));
  });
  return dir;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log("wrote", writeBigFiles(process.argv[2] ?? "."));
}
