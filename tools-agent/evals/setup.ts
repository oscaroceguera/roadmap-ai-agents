// Vitest doesn't load .env files itself; load it here so process.env has
// OPENAI_API_KEY before any test calls the OpenAI provider. Optional: CI
// environments set these vars directly and have no .env file on disk.
try {
  process.loadEnvFile();
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}
