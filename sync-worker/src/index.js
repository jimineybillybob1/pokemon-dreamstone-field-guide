const MAX_BODY_BYTES = 65536;
const SAVE_TTL_SECONDS = 60 * 60 * 24 * 400;
const saveIdPattern = /^[a-f0-9]{64}$/;
const encodedValuePattern = /^[A-Za-z0-9_-]+$/;

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
  return (
    value &&
    value.version === 1 &&
    typeof value.iv === "string" &&
    value.iv.length >= 16 &&
    value.iv.length <= 32 &&
    encodedValuePattern.test(value.iv) &&
    typeof value.ciphertext === "string" &&
    value.ciphertext.length >= 24 &&
    value.ciphertext.length <= MAX_BODY_BYTES &&
    encodedValuePattern.test(value.ciphertext) &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (!headers) return jsonResponse({ error: "Origin not allowed" }, 403, {});
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ status: "ok" }, 200, headers);
    }

    const match = url.pathname.match(/^\/saves\/([a-f0-9]{64})$/);
    if (!match || !saveIdPattern.test(match[1])) {
      return jsonResponse({ error: "Invalid save ID" }, 404, headers);
    }
    const key = `save:${match[1]}`;

    if (request.method === "GET") {
      const value = await env.SAVES.get(key);
      if (value === null) return jsonResponse({ error: "Save not found" }, 404, headers);
      return new Response(value, { status: 200, headers: { "Content-Type": "application/json", ...headers } });
    }

    if (request.method === "PUT") {
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > MAX_BODY_BYTES) {
        return jsonResponse({ error: "Save is too large" }, 413, headers);
      }
      const text = await request.text();
      if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
        return jsonResponse({ error: "Save is too large" }, 413, headers);
      }
      let envelope;
      try {
        envelope = JSON.parse(text);
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400, headers);
      }
      if (!validEnvelope(envelope)) {
        return jsonResponse({ error: "Invalid encrypted save envelope" }, 400, headers);
      }
      await env.SAVES.put(key, JSON.stringify(envelope), { expirationTtl: SAVE_TTL_SECONDS });
      return jsonResponse({ saved: true, updatedAt: envelope.updatedAt }, 200, headers);
    }

    return jsonResponse({ error: "Method not allowed" }, 405, headers);
  },
};
