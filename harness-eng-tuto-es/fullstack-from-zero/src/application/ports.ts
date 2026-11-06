import type { Talk } from "../domain/talk.js";

export type { Talk } from "../domain/talk.js";

export interface TalkRepository {
  save(talk: Talk): Promise<void>;
  findById(id: string): Promise<Talk | null>;
  list(): Promise<Talk[]>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}
