import { tool } from "ai";
import { z } from "zod";
import { SPEAKERS, TALKS } from "./data";

export const searchTalks = tool({
  description:
    "Search the conference catalog. Matches the keyword against talk titles and tracks " +
    "(frontend, backend, ai). Use this before recommending or booking any talk.",
  inputSchema: z.object({
    q: z.string().describe('A keyword such as "backend", "react" or "agents"'),
  }),
  execute: async ({ q }) => {
    console.log(`    🔎 searchTalks(${q})`);
    const needle = q.toLocaleLowerCase();
    return TALKS.filter((t) =>
      `${t.title} ${t.track}`.toLocaleLowerCase().includes(needle),
    );
  },
});

export const getSpeaker = tool({
  description:
    "Get the name and bio of a speaker. Use the speakerId from a talk returned by searchTalks.",
  inputSchema: z.object({
    speakerId: z.number().describe("The speakerId field of a talk"),
  }),
  execute: async ({ speakerId }) => {
    console.log(`    👤 getSpeaker(${speakerId})`);
    const speaker = SPEAKERS.find((s) => s.id === speakerId);
    // Return an error object instead of throwing, so the model can read it and recover
    return speaker ?? { error: `No speaker with id ${speakerId}` };
  },
});

export const bookSeat = tool({
  description:
    "Book a seat for the current attendee in one talk. " +
    "Only call after the user has chosen a talk that searchTalks returned.",
  inputSchema: z.object({
    talkId: z.number().describe("The id of the talk to book"),
  }),
  // What YOUR code needs to run this tool. The model never sees it.
  contextSchema: z.object({
    dbUrl: z.string(),
    apiKey: z.string(),
  }),
  execute: async ({ talkId }, { context }) => {
    const talk = TALKS.find((t) => t.id === talkId);

    if (!talk) return { ok: false, error: `No talk with id ${talkId}` };

    // Fake "DB write": a real version would use context.dbUrl and context.apiKey here
    const db = context.dbUrl.split("/").pop(); // 'fake-db-01'
    console.log(
      `    💺 booked talk ${talk.id} (${talk.title}) db=${db} key=${context.apiKey.slice(0, 4)}…`,
    );

    return { ok: true, talkTitle: talk.title };
  },
});
