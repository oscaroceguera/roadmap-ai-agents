import { generateText } from "ai";
import { MODEL } from "./model";

const { text } = await generateText({ model: MODEL, prompt: 'Say "ok"' });
console.log(text);
