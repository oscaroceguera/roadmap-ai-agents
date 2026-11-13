// Sample data inspired by JSConf MX. Fictional talks — swap for a DB/API later.
export interface Talk {
  year: number;
  title: string;
  speaker: string;
  track: 'main' | 'workshop';
  tags: string[];
}

export const TALKS: readonly Talk[] = [
  { year: 2024, title: 'Signals in the Wild', speaker: 'Ana López', track: 'main', tags: ['react', 'signals'] },
  { year: 2024, title: 'Edge Functions from Zero', speaker: 'Diego Ramírez', track: 'workshop', tags: ['vercel', 'edge'] },
  { year: 2025, title: 'Type-Safe APIs with Zod 4', speaker: 'María Fernández', track: 'main', tags: ['typescript', 'zod'] },
  { year: 2025, title: 'Testing at the Speed of Vitest', speaker: 'Luis Herrera', track: 'workshop', tags: ['testing', 'vitest'] },
  { year: 2026, title: 'Shipping MCP Servers to Production', speaker: 'Oscar Oceguera', track: 'main', tags: ['mcp', 'ai', 'node'] }
];

export const YEARS = [...new Set(TALKS.map((t) => t.year))].sort();

export function talksByYear(year: number): Talk[] {
  return TALKS.filter((t) => t.year === year);
}