import {
  createTalk,
  submitTalk,
  withdrawTalk,
  DomainError,
  type Talk,
} from "../domain/talk.js";
import type { Clock, IdGenerator, TalkRepository } from "./ports.js";

export type { Talk };
export { DomainError };

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface TalkUseCases {
  propose(input: { title: string; speaker: string }): Promise<Talk>;
  submit(id: string): Promise<Talk>;
  withdraw(id: string): Promise<Talk>;
  list(): Promise<Talk[]>;
}

export function makeTalkUseCases(deps: {
  repo: TalkRepository;
  clock: Clock;
  ids: IdGenerator;
}): TalkUseCases {
  return {
    async propose(input) {
      const talk = createTalk({ id: deps.ids.next(), ...input });
      await deps.repo.save(talk);
      return talk;
    },
    async submit(id) {
      const talk = await deps.repo.findById(id);
      if (!talk) throw new NotFoundError(`No existe la charla ${id}`);
      const submitted = submitTalk(talk, deps.clock.now());
      await deps.repo.save(submitted);
      return submitted;
    },
    async withdraw(id) {
      const talk = await deps.repo.findById(id);
      if (!talk) throw new NotFoundError(`No existe la charla ${id}`);
      const withdrawn = withdrawTalk(talk, deps.clock.now());
      await deps.repo.save(withdrawn);
      return withdrawn;
    },
    list: () => deps.repo.list(),
  };
}
