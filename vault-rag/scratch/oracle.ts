import { oracleDocs } from "../evals/oracle";
import questions from "../evals/questions.json";

for (const q of questions) {
  const docs = await oracleDocs(q);
  const paths = docs.map((d) => d.path);
  const ok =
    docs.length === q.expect.length + 2 &&
    paths[1] === q.expect[0] &&
    new Set(paths).size === paths.length &&
    docs.every((d) => d.text.length > 0);
  const tokens = Math.round(docs.reduce((s, d) => s + d.text.length, 0) / 4);
  console.log(ok ? "✅" : "❌", q.id, `~${tokens} tok`, paths.join(" | "));
}
