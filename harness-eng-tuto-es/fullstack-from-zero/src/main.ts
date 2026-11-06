// Composition root: el único archivo que conoce todas las capas.
import { makeTalkUseCases } from "./application/talk-use-cases.js";
import { InMemoryTalkRepository } from "./infrastructure/in-memory-talk-repository.js";
import { systemClock, uuidGenerator } from "./infrastructure/system.js";
import { createApp } from "./ui/http/app.js";

const talks = makeTalkUseCases({
  repo: new InMemoryTalkRepository(),
  clock: systemClock,
  ids: uuidGenerator,
});
const port = Number(process.env.PORT ?? 3000);
createApp(talks).listen(port, () => {
  process.stdout.write(`API lista en http://localhost:${port}\n`);
});
