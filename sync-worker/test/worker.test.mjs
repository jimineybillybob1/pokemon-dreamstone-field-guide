import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://jimineybillybob1.github.io";
const values = new Map();
const env = {
  ALLOWED_ORIGINS: origin,
  SAVES: {
    get: async (key) => values.get(key) ?? null,
    put: async (key, value) => values.set(key, value),
  },
};
const id = "a".repeat(64);
const envelope = {
  version: 1,
  iv: "A".repeat(16),
  ciphertext: "B".repeat(32),
  updatedAt: "2026-06-09T18:00:00.000Z",
};
const request = (path, options = {}) =>
  new Request(`https://sync.example${path}`, {
    ...options,
    headers: { Origin: origin, ...(options.headers || {}) },
  });

const health = await worker.fetch(request("/health"), env);
assert.equal(health.status, 200);

const missing = await worker.fetch(request(`/saves/${id}`), env);
assert.equal(missing.status, 404);

const saved = await worker.fetch(
  request(`/saves/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(envelope),
  }),
  env,
);
assert.equal(saved.status, 200);

const loaded = await worker.fetch(request(`/saves/${id}`), env);
assert.equal(loaded.status, 200);
assert.deepEqual(await loaded.json(), envelope);

const blocked = await worker.fetch(
  new Request(`https://sync.example/saves/${id}`, { headers: { Origin: "https://example.com" } }),
  env,
);
assert.equal(blocked.status, 403);

const invalid = await worker.fetch(
  request(`/saves/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }),
  env,
);
assert.equal(invalid.status, 400);

console.log("Sync Worker test passed");
