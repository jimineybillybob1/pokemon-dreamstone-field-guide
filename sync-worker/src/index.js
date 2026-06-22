const MAX_BODY_BYTES = 65536;
const SAVE_TTL_SECONDS = 60 * 60 * 24 * 400;
const HISTORY_LIMIT = 8;
const saveIdPattern = /^[a-f0-9]{64}$/;
const historyIdPattern = /^[A-Za-z0-9_-]{10,160}$/;
const encodedValuePattern = /^[A-Za-z0-9_-]+$/;
const deviceIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jsonResponse = (body, status, headers) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function validEnvelope(value) {
  const encryptedFieldsAreValid =
    value &&
    (value.version === 1 || value.version === 2) &&
    typeof value.iv === "string" &&
    value.iv.length >= 16 &&
    value.iv.length <= 32 &&
    encodedValuePattern.test(value.iv) &&
    typeof value.ciphertext === "string" &&
    value.ciphertext.length >= 24 &&
    value.ciphertext.length <= MAX_BODY_BYTES &&
    encodedValuePattern.test(value.ciphertext) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt));
  if (!encryptedFieldsAreValid || value.version === 1) return Boolean(encryptedFieldsAreValid);
  return (
    Number.isInteger(value.revision) &&
    value.revision >= 1 &&
    (value.parentRevision === null || (Number.isInteger(value.parentRevision) && value.parentRevision >= 0)) &&
    deviceIdPattern.test(value.deviceId || "") &&
    typeof value.modifiedAt === "string" &&
    !Number.isNaN(Date.parse(value.modifiedAt))
  );
}

const envelopeRevision = (envelope) =>
  envelope?.version === 2 && Number.isInteger(envelope.revision) ? envelope.revision : 0;

const envelopeMetadata = (envelope, versionId = "") => ({
  versionId,
  revision: envelopeRevision(envelope),
  updatedAt: envelope.updatedAt,
  modifiedAt: envelope.modifiedAt || envelope.updatedAt,
  deviceId: envelope.deviceId || "legacy",
});

async function readEnvelope(env, key) {
  const value = await env.SAVES.get(key);
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function historyVersionId(envelope) {
  const timestamp = Date.parse(envelope.updatedAt) || Date.now();
  const device = (envelope.deviceId || "legacy").replaceAll("-", "");
  return `${timestamp}-${device}-${envelopeRevision(envelope)}-${envelope.ciphertext.slice(0, 10)}`;
}

async function storeHistoryVersion(env, saveId, envelope) {
  const versionId = historyVersionId(envelope);
  const key = `history:${saveId}:${versionId}`;
  await env.SAVES.put(key, JSON.stringify(envelope), {
    expirationTtl: SAVE_TTL_SECONDS,
    metadata: envelopeMetadata(envelope, versionId),
  });
  if (!env.SAVES.list || !env.SAVES.delete) return;
  const listed = await env.SAVES.list({ prefix: `history:${saveId}:` });
  const stale = [...(listed.keys || [])].sort((a, b) => b.name.localeCompare(a.name)).slice(HISTORY_LIMIT);
  await Promise.all(stale.map((entry) => env.SAVES.delete(entry.name)));
}

async function parseRequestEnvelope(request, headers) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return { response: jsonResponse({ error: "Save is too large" }, 413, headers) };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { response: jsonResponse({ error: "Save is too large" }, 413, headers) };
  }
  try {
    const envelope = JSON.parse(text);
    if (!validEnvelope(envelope)) {
      return { response: jsonResponse({ error: "Invalid encrypted save envelope" }, 400, headers) };
    }
    return { envelope };
  } catch {
    return { response: jsonResponse({ error: "Invalid JSON" }, 400, headers) };
  }
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (!headers) return jsonResponse({ error: "Origin not allowed" }, 403, {});
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ status: "ok", syncVersion: 2 }, 200, headers);
    }

    const historyMatch = url.pathname.match(/^\/saves\/([a-f0-9]{64})\/history(?:\/([A-Za-z0-9_-]+))?$/);
    if (historyMatch && saveIdPattern.test(historyMatch[1]) && request.method === "GET") {
      const [, saveId, versionId] = historyMatch;
      if (versionId) {
        if (!historyIdPattern.test(versionId)) return jsonResponse({ error: "Invalid version ID" }, 404, headers);
        const envelope = await env.SAVES.get(`history:${saveId}:${versionId}`);
        if (envelope === null) return jsonResponse({ error: "Version not found" }, 404, headers);
        return new Response(envelope, { status: 200, headers: { "Content-Type": "application/json", ...headers } });
      }
      if (!env.SAVES.list) return jsonResponse({ versions: [] }, 200, headers);
      const listed = await env.SAVES.list({ prefix: `history:${saveId}:` });
      const versions = (listed.keys || [])
        .map((entry) => entry.metadata)
        .filter(Boolean)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, HISTORY_LIMIT);
      return jsonResponse({ versions }, 200, headers);
    }

    const match = url.pathname.match(/^\/saves\/([a-f0-9]{64})$/);
    if (!match || !saveIdPattern.test(match[1])) {
      return jsonResponse({ error: "Invalid save ID" }, 404, headers);
    }
    const saveId = match[1];
    const key = `save:${saveId}`;

    if (request.method === "GET") {
      const value = await env.SAVES.get(key);
      if (value === null) return jsonResponse({ error: "Save not found" }, 404, headers);
      return new Response(value, { status: 200, headers: { "Content-Type": "application/json", ...headers } });
    }

    if (request.method === "PUT") {
      const parsed = await parseRequestEnvelope(request, headers);
      if (parsed.response) return parsed.response;
      const envelope = parsed.envelope;
      const current = await readEnvelope(env, key);
      const currentRevision = envelopeRevision(current);

      if (envelope.version === 1 && current?.version === 2) {
        return jsonResponse({ error: "This app is too old to replace the current cloud save." }, 409, headers);
      }
      if (
        envelope.version === 2 &&
        ((current && envelope.parentRevision !== currentRevision) ||
          (!current && envelope.parentRevision !== null && envelope.parentRevision !== 0) ||
          envelope.revision <= currentRevision)
      ) {
        return jsonResponse(
          {
            error: "Cloud save changed since this device last checked.",
            current: current ? envelopeMetadata(current) : null,
          },
          409,
          headers,
        );
      }

      if (current) await storeHistoryVersion(env, saveId, current);
      await storeHistoryVersion(env, saveId, envelope);
      await env.SAVES.put(key, JSON.stringify(envelope), {
        expirationTtl: SAVE_TTL_SECONDS,
        metadata: envelopeMetadata(envelope),
      });
      return jsonResponse({ saved: true, ...envelopeMetadata(envelope) }, 200, headers);
    }

    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  },
};
