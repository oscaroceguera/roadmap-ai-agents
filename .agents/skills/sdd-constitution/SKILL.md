---
name: sdd-constitution
description: Bootstraps a new project's foundational specs directory — specs/mission.md, specs/tech-stack.md, and specs/roadmap.md — by interviewing the user in one grouped AskUserQuestion call before writing anything to disk. Trigger when starting a new project, setting up spec-driven development, or when the user says "constitution", "mission", "tech stack", "roadmap", "set up specs", or invokes /sdd-constitution.
model: sonnet
---

# SDD Constitution

## Workflow

### 1. Check for existing specs

Read `specs/mission.md`, `specs/tech-stack.md`, and `specs/roadmap.md` if they exist. If any are present, this is an amendment: summarize what's already there before proposing changes, and preserve prior decisions unless the user asks to change them.

### 2. Interview the user — BEFORE writing any files

Use `AskUserQuestion` with exactly **3 questions in one call**:

| Header | Question focus |
|---|---|
| **Mission** | What the project is, who it's for, the problem it solves, what success looks like |
| **Tech Stack** | Languages, frameworks, key libraries/tools, and any existing conventions or hard constraints to respect |
| **Roadmap** | The rough order of work — what should happen first, and how to break it into small phases |

Do **not** write any files until the user has answered all three questions.

### 3. Write the three files

#### `specs/mission.md`
- Problem statement
- Target users
- Goals / non-goals
- Success criteria

#### `specs/tech-stack.md`
- Languages & frameworks
- Key libraries and tools
- Conventions and constraints (e.g. no new dependencies without approval)

#### `specs/roadmap.md`
- Ordered phases of work, each a small, independently shippable unit — prefer more, smaller phases over a few large ones
- Each phase as its own heading with checklist items, e.g.:

```markdown
## Phase 1: <name>
- [ ] Task
- [ ] Task

## Phase 2: <name>
- [ ] Task
```

`feature-spec` finds the next phase by locating the first heading whose items are all `[ ]` — keep phases in that format so it can pick up from here.

### 4. Report back

Confirm which files were created or updated, and note that `feature-spec` will start from the first incomplete phase in `roadmap.md`.

## Constraints

- Never write to disk until all 3 questions are answered.
- Keep roadmap phases small enough to complete in one sitting; split anything bigger.
- Don't invent mission, stack, or phase details the user didn't state or clearly imply — ask rather than assume.
