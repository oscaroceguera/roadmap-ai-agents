import { embed, generateText } from "ai";
import { embeddingModel, model } from "../src/models";

const { text } = await generateText({
  model,
  prompt: "Reply with the single word: ok",
});
const { embedding } = await embed({
  model: embeddingModel,
  value: "hola vault",
});
console.log({ text, dims: embedding.length });
