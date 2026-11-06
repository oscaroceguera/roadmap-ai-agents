export type TalkStatus = "draft" | "submitted";

export interface Talk {
  readonly id: string;
  readonly title: string;
  readonly speaker: string;
  readonly status: TalkStatus;
  readonly submittedAt: Date | null;
  readonly withdrawnAt: Date | null;
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export function createTalk(input: {
  id: string;
  title: string;
  speaker: string;
}): Talk {
  const title = input.title.trim();
  if (title.length < 5)
    throw new DomainError("El título debe tener al menos 5 caracteres");
  if (input.speaker.trim() === "")
    throw new DomainError("El speaker es obligatorio");
  return {
    id: input.id,
    title,
    speaker: input.speaker.trim(),
    status: "draft",
    submittedAt: null,
    withdrawnAt: null,
  };
}

export function submitTalk(talk: Talk, now: Date): Talk {
  if (talk.status === "submitted")
    throw new DomainError("La charla ya fue enviada");
  return { ...talk, status: "submitted", submittedAt: now };
}

export function withdrawTalk(talk: Talk, now: Date): Talk {
  if (talk.status === "draft")
    throw new DomainError("La charla no está enviada");
  return { ...talk, status: "draft", submittedAt: null, withdrawnAt: now };
}
