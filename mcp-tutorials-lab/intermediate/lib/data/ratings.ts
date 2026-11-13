// Simulated upstream "ratings" API. In real life this would be a fetch() to another service.
const RATINGS: Record<string, number> = {
  "Signals in the Wild": 4.7,
  "Edge Functions from Zero": 4.4,
  "Type-Safe APIs with Zod 4": 4.9,
  "Testing at the Speed of Vitest": 4.6,
  "Shipping MCP Servers to Production": 4.8,
};

export async function fetchRating(title: string): Promise<number | undefined> {
  if (process.env.RATINGS_DOWN === "1")
    throw new Error("ratings upstream unavailable (503)");
  return RATINGS[title];
}
