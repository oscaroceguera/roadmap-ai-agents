import questions from "../evals/questions.json";
import { grepSearch } from "../src/search/grep";

let hits = 0;
for (const q of questions) {
  const top = grepSearch(q.question)
    .slice(0, 3)
    .map((h) => h.path);
  const ok = q.expect.some((e) => top.includes(e));
  if (ok) hits++;
  console.log(ok ? "✅" : "❌", q.id, top.join(" | "));
}
console.log(`grep hit@3: ${hits}/${questions.length}`);
