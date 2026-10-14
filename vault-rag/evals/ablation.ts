import { generateText, Output } from "ai";

import { z } from "zod";
import { model, PRICE_PER_1M } from "../src/models";
import { ladder, type Row } from "./ablation-prompts";
import { type Doc, oracleDocs } from "./oracle";
import questions from "./questions.json";

const RUNS = Number(process.env.EVAL_RUNS ?? 3);
const Answer = z.object({
  answer: z.string(),
  citations: z.array(z.number().int()),
});

async function ask(row: Row, question: string, docs: Doc[]) {
  const base = {
    model,
    system: row.system,
    prompt: row.render(question, docs),
  };

  if (row.structured) {
    const res = await generateText({
      ...base,
      output: Output.object({
        schema: Answer,
      }),
    });

    return {
      text: res.output.answer,
      citations: res.output.citations,
      usage: res.usage,
    };
  }

  const res = await generateText(base);
  const citations = [...res.text.matchAll(/\[(\d+)\]/g)].map((m) =>
    Number(m[1]),
  );
  return {
    text: res.text,
    citations,
    usage: res.usage,
  };
}

// Documents are built once: every row must see exactly the same context.
const cases = await Promise.all(
  questions.map(async (q) => ({ q, docs: await oracleDocs(q) })),
);
const rows: string[] = [];

for (const row of ladder) {
  const rates: number[] = [];
  let cited = 0;
  let inTok = 0;
  let outTok = 0;
  for (let run = 0; run < RUNS; run++) {
    let correct = 0;
    for (const { q, docs } of cases) {
      const r = await ask(row, q.question, docs);
      inTok += r.usage.inputTokens ?? 0;
      outTok += r.usage.outputTokens ?? 0;
      if (
        q.mustInclude.every((t) =>
          r.text.toLowerCase().includes(t.toLowerCase()),
        )
      )
        correct++;
      if (
        r.citations.some(
          (n) => docs[n - 1] && q.expect.includes(docs[n - 1].path),
        )
      )
        cited++;
    }
    rates.push(correct / cases.length);
  }
  const calls = RUNS * cases.length;
  const mean = rates.reduce((a, b) => a + b, 0) / RUNS;
  const spread = Math.max(...rates) - Math.min(...rates);
  const cost =
    (inTok * PRICE_PER_1M.input + outTok * PRICE_PER_1M.output) / 1e6 / calls;
  rows.push(
    `| ${row.name} | ${mean.toFixed(2)} | ${spread.toFixed(2)} | ${(cited / calls).toFixed(2)} | ${Math.round(inTok / calls)} | $${cost.toFixed(4)} |`,
  );
}

console.log(
  [
    "| Row | Correct | Spread | Cites right note | Input tok/call | Cost/call |",
    "|---|---|---|---|---|---|",
    ...rows,
  ].join("\n"),
);
