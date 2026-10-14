import type { Doc } from "./oracle";

export type Row = {
  name: string;
  system: string;
  render: (question: string, docs: Doc[]) => string;
  structured?: boolean;
};

const numbered = (docs: Doc[]) =>
  docs.map((d, i) => `[${i + 1}] ${d.path}\n${d.text}`).join("\n\n");
const tagged = (docs: Doc[]) =>
  docs
    .map(
      (d, i) =>
        `<document n="${i + 1}" path="${d.path}">\n${d.text}\n</document>`,
    )
    .join("\n\n");

const BASE =
  "Answer the question using only these notes from Oscar's Obsidian vault. Cite the notes you used as [1], [2]. If the notes don't contain the answer, say so.";

// Hand-written. They must NOT be any of your 10 eval questions, or row 1 measures memorization.
const FEW_SHOT = `Examples of good answers:
Q: Which database does the durable loop use?
A: Postgres on Neon, through DBOS [2].
Q: What is the Kata block for?
A: Rebuilding last week's core piece from memory, on a 30-minute timer [1].`;

// Ask the model: "Write 3 example questions and ideal cited answers for an assistant over a personal
// Obsidian vault about AI agents." Paste them here. Row 2 REPLACES the hand-written examples.
const GENERATED = `Examples of good answers:\n...`;

// After rows 0–2 run, set this to whichever of FEW_SHOT / GENERATED scored higher.
const BEST = FEW_SHOT;
const COT =
  "First find the passage that answers the question, then write the answer.";
const PERSONA =
  "You are Oscar's research assistant and you know how he organizes his vault.";

const qFirstPlain = (q: string, d: Doc[]) => `${q}\n\n${numbered(d)}`;
const qFirstTagged = (q: string, d: Doc[]) =>
  `<question>${q}</question>\n\n${tagged(d)}`;
const qLastTagged = (q: string, d: Doc[]) =>
  `${tagged(d)}\n\n<question>${q}</question>`;

export const ladder: Row[] = [
  { name: "0 baseline", system: BASE, render: qFirstPlain },
  {
    name: "1 + few-shot",
    system: `${BASE}\n\n${FEW_SHOT}`,
    render: qFirstPlain,
  },
  {
    name: "2 + generated few-shot",
    system: `${BASE}\n\n${GENERATED}`,
    render: qFirstPlain,
  },
  {
    name: "3 + XML delimiters",
    system: `${BASE}\n\n${BEST}`,
    render: qFirstTagged,
  },
  {
    name: "4 + CoT",
    system: `${BASE}\n\n${BEST}\n\n${COT}`,
    render: qFirstTagged,
  },
  {
    name: "5 + context placement",
    system: `${BASE}\n\n${BEST}\n\n${COT}`,
    render: qLastTagged,
  },
  {
    name: "6 + structured output",
    system: `${BASE}\n\n${BEST}\n\n${COT}`,
    render: qLastTagged,
    structured: true,
  },
  {
    name: "7 + persona",
    system: `${PERSONA}\n${BASE}\n\n${BEST}\n\n${COT}`,
    render: qLastTagged,
    structured: true,
  },
];
