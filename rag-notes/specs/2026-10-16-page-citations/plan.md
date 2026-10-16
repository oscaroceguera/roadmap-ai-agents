# Phase 5: Page citations in answers — Plan

## 1. Tests first (`src/lib/context.test.ts`)

1.1. `sourceLabel({ documentName: "paper.pdf", page: 3 })` → `"paper.pdf p.3"`.
1.2. `sourceLabel({ documentName: "notes.md", page: null })` → `"notes.md"`.
1.3. `sourceLabel` with `page: 1` → `"paper.pdf p.1"`.
1.4. `buildContext` with one PDF chunk and one `.md` chunk: it produces `[1] (source: paper.pdf p.3)\n<content>` and `[2] (source: notes.md)\n<content>`, joined by `\n\n---\n\n`.
1.5. `buildContext([])` → `""`.

## 2. `src/lib/context.ts`

2.1. Create the file with `sourceLabel` and `buildContext`. Use only `import type { RetrievedChunk } from "./retrieve"`.
2.2. Remove `buildContext` from `answer.ts` and import it from `@/lib/context`. Keep the prompt and `answer()` unchanged.
2.3. Check that nothing else imports `buildContext` from `@/lib/answer`.

## 3. Ask UI (`src/app/components/Ask.tsx`)

3.1. Add `page: number | null` to the `Source` type.
3.2. In the card header, render `· p.{s.page}` between the document name and `· chunk {s.index}` when `s.page != null`.

## 4. Verify and roadmap

4.1. Run the automated checks in `validation.md`.
4.2. Do the manual check against `multi.pdf`.
4.3. Tick the Phase 5 items in `specs/roadmap.md`.
