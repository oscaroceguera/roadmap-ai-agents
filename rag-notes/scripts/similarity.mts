import { embedMany, cosine } from "../src/lib/embed";

const [q, close, far] = await embedMany([
  "How do I reset my password?",
  "I forgot my login credentials and can't sign in",
  "The best tacos are in Culiacán",
]);

console.log("related:  ", cosine(q, close).toFixed(3));
console.log("unrelated:", cosine(q, far).toFixed(3));
console.log("dims:", q.length);
