import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://jimineybillybob1.github.io";
const values = new Map();
const metadata = new Map();
const env = {
  ALLOWED_ORIGINS: origin,
  SAVES: {
    get: async (key) => values.get(key) ?? null,
    put: async (key, value, options = {}) => {
      values.set(key, value);
      metadata.set(key, options.metadata);
    },
    delete: async (key) => {
      values.delete(key);
      metadata.delete(key);
    },
    list: async ({ prefix }) => ({
      keys: [...values.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((name) => ({ name, metadata: metadata.get(name) })),
    }),
  },
};
const id = "a".repeat(64);
const deviceId = "12345678-1234-4123-8123-123456789abc";
const envelope = (revision, parentRevision, suffix = "A") => ({
  version: 2,
  iv: suffix.repeat(16),
  ciphertext: suffix.repeat(32),
  updatedAt: `2026-06-09T18:00:0${revision}.000Z`,
  modifiedAt: `2026-06-09T17:00:0${revision}.000Z`,
  revision,
  parentRevision,
  deviceId,
});
const request = (path, options = {}) =>
  new Request(`https://sync.example${path}`, {
    ...options,
    headers: { Origin: origin, ...(options.headers || {}) },
  });
const put = (value) =>
  worker.fetch(
    request(`/saves/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }),
    env,
  );

const health = await worker.fetch(request("/health"), env);
assert.equal(health.status, 200);
assert.equal((await health.json()).syncVersion, 2);

const missing = await worker.fetch(request(`/saves/${id}`), env);
assert.equal(missing.status, 404);

assert.equal((await put(envelope(1, null, "A"))).status, 200);
const loaded = await worker.fetch(request(`/saves/${id}`), env);
assert.deepEqual(await loaded.json(), envelope(1, null, "A"));

const stale = await put(envelope(2, 0, "B"));
assert.equal(stale.status, 409);
assert.equal((await stale.json()).current.revision, 1);

assert.equal((await put(envelope(2, 1, "C"))).status, 200);
const history = await worker.fetch(request(`/saves/${id}/history`), env);
const versions = (await history.json()).versions;
assert.ok(versions.length >= 2);
assert.ok(versions.some((version) => version.revision === 1));
const historic = await worker.fetch(request(`/saves/${id}/history/${versions.find((entry) => entry.revision === 1).versionId}`), env);
assert.equal((await historic.json()).revision, 1);

const legacyOverwrite = await put({
  version: 1,
  iv: "D".repeat(16),
  ciphertext: "D".repeat(32),
  updatedAt: "2026-06-09T19:00:00.000Z",
});
assert.equal(legacyOverwrite.status, 409);

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
