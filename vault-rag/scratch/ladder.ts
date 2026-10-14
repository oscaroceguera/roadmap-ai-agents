import { ladder } from "../evals/ablation-prompts";
import questions from "../evals/questions.json";

ladder.forEach((row, i) => {
  const prev = ladder[i - 1];
  if (!prev) return console.log(row.name, "(base)");
  const changed = [
    row.system !== prev.system && "system",
    row.render !== prev.render && "render",
    row.structured !== prev.structured && "structured",
  ].filter(Boolean);
  console.log(row.name, "→", changed.join(" + "));
});
const leaked = questions.filter((q) =>
  ladder.some((r) => r.system.includes(q.question)),
);
console.log(
  "rows:",
  ladder.length,
  "| eval questions inside a prompt:",
  leaked.length,
);
console.log("GENERATED filled in:", !ladder[2].system.includes("..."));
