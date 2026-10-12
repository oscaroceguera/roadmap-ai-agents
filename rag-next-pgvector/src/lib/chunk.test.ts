import { describe, expect, it } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("texto vacío o sólo espacios: sin fragmentos", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("  \n\n \t ")).toEqual([]);
  });

  it("agrupa párrafos cortos en un solo fragmento y normaliza espacios", () => {
    expect(chunkText("FACTURA   A-1\n\n\nTotal:\t100")).toEqual(["FACTURA A-1\n\nTotal: 100"]);
  });

  it("empieza un fragmento nuevo cuando el siguiente párrafo no cabe", () => {
    const a = "a".repeat(6);
    const b = "b".repeat(6);
    expect(chunkText(`${a}\n\n${b}`, 10)).toEqual([a, b]);
  });

  it("parte párrafos largos por palabras", () => {
    const chunks = chunkText("uno dos tres cuatro cinco seis", 10);
    expect(chunks).toEqual(["uno dos", "tres", "cuatro", "cinco seis"]);
  });

  it("corta una palabra más larga que el máximo", () => {
    expect(chunkText("x".repeat(25), 10)).toEqual(["x".repeat(10), "x".repeat(10), "x".repeat(5)]);
  });

  it("ningún fragmento supera el máximo y no se pierde texto", () => {
    const words = Array.from({ length: 500 }, (_, i) => `palabra${i}`);
    const text = [words.slice(0, 200), words.slice(200)].map((w) => w.join(" ")).join("\n\n");

    const chunks = chunkText(text, 300);

    expect(chunks.every((c) => c.length <= 300)).toBe(true);
    expect(chunks.join(" ").split(/\s+/)).toEqual(words);
  });
});
