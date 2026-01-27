import worker from './src/index.ts';

const env = {
  DATABASE_URL: "postgres://mock:5432/mock",
  NODE_ENV: "development",
  ADMIN_API_KEY: "mock-key",
};

Bun.serve({
  port: 8787,
  fetch: (req) => worker.fetch(req, env),
});
console.log("Server running on http://localhost:8787");
