import { walkSources } from "../src/vault";

let n = 0;
for await (const note of walkSources()) {
  n++;
  if (note.body.trimStart().startsWith("---"))
    console.log("frontmatter left in?", note.path);
  if (note.path.startsWith("06 Personal/"))
    console.log("PRIVATE NOTE INDEXED:", note.path);
}
console.log("walker:", n);
