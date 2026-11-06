import type { Talk } from "../domain/talk.js";
import type { TalkRepository } from "../application/ports.js";

export class InMemoryTalkRepository implements TalkRepository {
  private readonly items = new Map<string, Talk>();

  async save(talk: Talk): Promise<void> {
    this.items.set(talk.id, talk);
  }

  async findById(id: string): Promise<Talk | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<Talk[]> {
    return [...this.items.values()];
  }
}
