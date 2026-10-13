export type Hit = {
  id: number;
  path: string;
  headingPath: string;
  content: string;
  score: number;
};
export type NoteHit = Pick<Hit, "path">;
