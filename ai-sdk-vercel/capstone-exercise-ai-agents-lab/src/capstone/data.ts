import { z } from "zod";

export const TalkSchema = z.object({
  id: z.number(),
  title: z.string(),
  track: z.string(),
  level: z.string(),
  speakerId: z.number(),
});

export type Talk = z.infer<typeof TalkSchema>; // replaces the hand-written type

// hand-written type
// export type Talk = {
//   id: number;
//   title: string;
//   track: string;
//   level: string;
//   speakerId: number;
// };

export const TALKS: Talk[] = [
  {
    id: 1,
    title: "Signals in React",
    track: "frontend",
    level: "advanced",
    speakerId: 10,
  },
  {
    id: 2,
    title: "Node streams 101",
    track: "backend",
    level: "beginner",
    speakerId: 11,
  },
  {
    id: 3,
    title: "Agents with the AI SDK",
    track: "ai",
    level: "intermediate",
    speakerId: 12,
  },
  {
    id: 4,
    title: "Edge runtimes deep dive",
    track: "backend",
    level: "advanced",
    speakerId: 11,
  },
];

export const SPEAKERS = [
  { id: 10, name: "Lucía Ramos", bio: "React core contributor" },
  { id: 11, name: "Diego Torres", bio: "Runtime engineer, ex-Node TSC" },
  { id: 12, name: "Sofía Méndez", bio: "Builds AI agents for fintech" },
];

export const AnswerSchema = z.object({
  recommended: z
    .array(TalkSchema)
    .describe(
      "Talks you recommend, copied exactly from searchTalks or research results",
    ),
  booked: z
    .array(z.string())
    .describe(
      "Titles of talks that bookSeat confirmed with ok: true in this conversation. Empty if none",
    ),
});
