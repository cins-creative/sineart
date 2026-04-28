/**
 * Sine Art — Worker gộp: API (upload R2/CF Images, proxy, …) + Messenger Agent
 *
 * Routes chính:
 * - GET  / hoặc /health — JSON status
 * - GET  /?hub.mode=subscribe… — Facebook webhook verify (challenge)
 * - POST / — Facebook Messenger webhook (header x-hub-signature-256)
 * - GET  …/agent/conversations , POST …/agent/toggle — Admin dashboard
 * - POST /upload-cf-images (+ x-api-secret) — ảnh Cloudflare cho Next.js admin
 *
 * Wrangler: workers/sine-art-api/wrangler.toml — bắt buộc KV binding "KV" (Messenger session + agent_ctx cache).
 *
 * Secrets: API_SECRET (= SINE_ART_WORKER_SECRET), SUPABASE_*, CF_*, Messenger: VERIFY_TOKEN, APP_SECRET, PAGE_TOKEN, ANTHROPIC_API_KEY
 */

// ─── Agent Messenger (agent-context + Claude) ───────────────────────────────
const SITE_CONTEXT_URLS = [
  "https://sineart.vn/api/agent-context",
  "https://sineart.vercel.app/api/agent-context",
];
const PAYMENT_BASE = "https://sineart.vn";

// ─── Cache TTL Airtable (giây) ─────────────────────────────────────────────
const CACHE_TTL = {
  DEFAULT: 60,
  BAIHOC: 300,
  HOCVIEN: 60,
  CHAT: 12,
  GALLERY: 120,
  NHANSU: 300,
  TAICHINH: 300,
};

const BASE_ID_HV = "applkO11hIay1KpY3";
const BASE_ID_CHAT = "appwJkrACYCXb27BS";
const BASE_ID_TC = "app2YEqcyFtSQLb67";
const BASE_ID_NS = "app6ZBzaX4WB446Qj";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-secret",
};

function getTTL(baseId, table) {
  if (baseId === BASE_ID_CHAT) return CACHE_TTL.CHAT;
  const t = String(table).toLowerCase();
  if (t.includes("bai") || t.includes("lesson")) return CACHE_TTL.BAIHOC;
  if (t.includes("hoc") || t.includes("student")) return CACHE_TTL.HOCVIEN;
  if (t.includes("gallery") || t.includes("anh")) return CACHE_TTL.GALLERY;
  if (baseId === BASE_ID_NS) return CACHE_TTL.NHANSU;
  if (baseId === BASE_ID_TC) return CACHE_TTL.TAICHINH;
  return CACHE_TTL.DEFAULT;
}

function makeCacheKey(baseId, table, search) {
  const raw = `at:${baseId}:${table}${search || ""}`;
  return raw.length <= 512 ? raw : raw.slice(0, 512);
}

async function kvGet(kv, key) {
  try {
    const raw = await kv.get(key, { type: "text" });
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function kvInvalidatePrefix(kv, prefix) {
  try {
    const list = await kv.list({ prefix, limit: 100 });
    if (!list.keys.length) return;
    await Promise.all(list.keys.map((k) => kv.delete(k.name)));
  } catch {
    /* noop */
  }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

function unauthorized() {
  return json({ ok: false, success: false, error: "Unauthorized" }, 401);
}

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** Header CORS cho endpoint /agent/* khi gọi từ browser admin */
function agentRouteHeaders() {
  return {
    ...CORS_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default {
  /**
   * @param {Request} request
   * @param {*} env
   * @param {{ waitUntil: (p: Promise<unknown>) => void }} ctx
   */
  async fetch(request, env, ctx) {
    const execCtx = ctx ?? { waitUntil: () => {} };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    // ─── Messenger: webhook verify GET (Facebook gửi query hub.mode …) ─────
    if (request.method === "GET" && url.searchParams.get("hub.mode") === "subscribe") {
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (token === env.VERIFY_TOKEN && challenge != null) {
        return new Response(challenge);
      }
      return new Response("Forbidden", { status: 403 });
    }

    // ─── Messenger: webhook POST (có header chữ ký FB) ─────────────────────
    const fbSig = request.headers.get("x-hub-signature-256");
    if (request.method === "POST" && fbSig) {
      const rawBody = await request.text();
      if (!(await verifyFbSignature(rawBody, fbSig, env.APP_SECRET))) {
        return new Response("Unauthorized", { status: 401 });
      }
      let body;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return new Response("Bad request", { status: 400 });
      }
      for (const entry of body.entry ?? []) {
        for (const event of entry.messaging ?? []) {
          if (!event.message?.text || event.message?.is_echo) continue;
          console.log(`MSG: ${event.sender.id} — "${event.message.text}"`);
          execCtx.waitUntil(
            processMessengerMessage({ sender_id: event.sender.id, text: event.message.text }, env)
              .then(() => console.log("OK"))
              .catch((e) => console.error("ERR:", e.message))
          );
        }
      }
      return new Response("OK");
    }

    // ─── Health JSON ────────────────────────────────────────────────────────
    if ((path === "/" || path === "/health") && request.method === "GET") {
      return json({
        ok: true,
        service: "sine-art",
        features: ["messenger-agent", "upload-cf-images", "fetch-url", "supabase-proxy", "airtable-proxy", "r2-images"],
      });
    }

    // ─── PUBLIC: file từ R2 ─────────────────────────────────────────────────
    if (path.startsWith("/images/")) {
      const key = path.replace("/images/", "");
      if (!key) return json({ ok: false, error: "Not found" }, 404);

      if (request.method === "DELETE") {
        const secret = request.headers.get("x-api-secret");
        if (!secret || secret !== env.API_SECRET) return unauthorized();
        if (!env.R2) return json({ error: "R2 not bound", ok: false }, 503);
        await env.R2.delete(key);
        return json({ success: true, ok: true });
      }

      if (request.method !== "GET") {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }

      if (!env.R2) return json({ ok: false, error: "R2 not bound" }, 503);
      const object = await env.R2.get(key);
      if (!object) return json({ ok: false, error: "Not found" }, 404);

      const headers = new Headers({
        ...CORS_HEADERS,
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
        ...(object.httpMetadata?.contentType?.startsWith("image/")
          ? {}
          : {
              "Content-Disposition": `attachment; filename="${key.split("_").slice(2).join("_") || key}"`,
            }),
      });
      return new Response(object.body, { headers });
    }

    // ─── WEBHOOK SEPAY ─────────────────────────────────────────────────────
    if (path === "/webhook/sepay" && request.method === "POST") {
      const SUPABASE_URL = env.SUPABASE_URL;
      const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return json({ error: "Missing SUPABASE_URL or keys", ok: false }, 503);
      }

      const sbH = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      };

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: "Bad Request" }, 400);
      }

      if (payload.transferType !== "in") {
        return json({ skip: "not_incoming" });
      }

      const content = payload.content || "";
      const match = content.match(/SA\d{6}/i);
      const maDonSo = match ? match[0].toUpperCase() : null;

      await fetch(`${SUPABASE_URL}/rest/v1/hp_giao_dich_thanh_toan`, {
        method: "POST",
        headers: sbH,
        body: JSON.stringify({
          gateway: payload.gateway || null,
          transaction_date: payload.transactionDate
            ? new Date(payload.transactionDate).toISOString()
            : new Date().toISOString(),
          transfer_amount: payload.transferAmount || 0,
          transfer_type: payload.transferType || null,
          content,
          account_number: payload.accountNumber || null,
          ma_don_trich_xuat: maDonSo,
          raw_webhook: payload,
        }),
      });

      if (!maDonSo) {
        return json({ ok: true, matched: false, reason: "no_ma_don" });
      }

      const donRes = await fetch(
        `${SUPABASE_URL}/rest/v1/hp_don_thu_hoc_phi?ma_don_so=eq.${encodeURIComponent(maDonSo)}&select=id,status`,
        { headers: sbH }
      );
      const donList = await donRes.json();
      const don = Array.isArray(donList) ? donList[0] : null;

      if (!don) {
        return json({ ok: true, matched: false, reason: "don_not_found" });
      }

      if (don.status === "Đã thanh toán") {
        return json({ ok: true, matched: true, reason: "already_paid" });
      }

      const today = new Date().toISOString().split("T")[0];

      await fetch(`${SUPABASE_URL}/rest/v1/hp_don_thu_hoc_phi?id=eq.${don.id}`, {
        method: "PATCH",
        headers: sbH,
        body: JSON.stringify({
          status: "Đã thanh toán",
          ngay_thanh_toan: today,
        }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/hp_thu_hp_chi_tiet?don_thu=eq.${don.id}`, {
        method: "PATCH",
        headers: sbH,
        body: JSON.stringify({ status: "Đã thanh toán" }),
      });

      return json({ ok: true, matched: true, don_id: don.id });
    }

    // ─── Agent admin: conversations / toggle (không x-api-secret) ─────────
    if (path.endsWith("/agent/conversations") && request.method === "GET") {
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/ag_conversation_log?select=sender_id,message,role,agent_active,created_at&order=created_at.desc&limit=100`,
        { headers: sbHeaders(env) }
      );
      return new Response(await res.text(), {
        headers: { "Content-Type": "application/json", ...agentRouteHeaders() },
      });
    }

    if (path.endsWith("/agent/toggle") && request.method === "POST") {
      const { sender_id, active } = await request.json();
      const key = `session:${sender_id}`;
      let session = { history: [], agent_active: true };
      try {
        const raw = await env.KV.get(key);
        if (raw) session = JSON.parse(raw);
      } catch {}
      session.agent_active = active;
      await env.KV.put(key, JSON.stringify(session), { expirationTtl: 86400 });
      return new Response(JSON.stringify({ ok: true, sender_id, agent_active: active }), {
        headers: { "Content-Type": "application/json", ...agentRouteHeaders() },
      });
    }

    // ─── Auth: upload + proxy Airtable/Supabase/fetch-url ───────────────────
    const secret = request.headers.get("x-api-secret");
    if (!env.API_SECRET) {
      return json({ ok: false, error: "Worker missing API_SECRET" }, 503);
    }
    if (secret !== env.API_SECRET) {
      return unauthorized();
    }

    if (path === "/fetch-url" && request.method === "POST") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON body" }, 400);
      }
      const target = typeof payload?.url === "string" ? payload.url.trim() : "";
      if (!target || !/^https?:\/\//i.test(target)) {
        return json({ ok: false, error: "Invalid URL" }, 400);
      }
      const extraHeaders =
        payload?.headers && typeof payload.headers === "object" ? payload.headers : {};

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        ...extraHeaders,
      };

      let upstream;
      try {
        upstream = await fetch(target, {
          method: "GET",
          headers,
          redirect: "follow",
          cf: { cacheTtl: 0, cacheEverything: false },
        });
      } catch (e) {
        return json(
          { ok: false, error: `Upstream fetch failed: ${e?.message || String(e)}` },
          502
        );
      }

      const contentType = upstream.headers.get("content-type") ?? "";
      const html = await upstream.text();

      return json({
        ok: upstream.ok,
        status: upstream.status,
        statusText: upstream.statusText,
        contentType,
        finalUrl: upstream.url || target,
        html,
      });
    }

    if (path === "/upload" && request.method === "POST") {
      if (!env.R2) return json({ error: "R2 not bound", success: false, ok: false }, 503);
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file.stream !== "function") {
        return json({ error: "No file provided", ok: false }, 400);
      }
      const ext = (file.name && file.name.split(".").pop()) || "bin";
      const safeName = String(file.name || "file")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
      const key = `${Date.now()}_${safeName}.${ext}`;
      await env.R2.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      });
      return json({
        ok: true,
        success: true,
        url: `${url.origin}/images/${key}`,
        key,
        filename: file.name || key,
      });
    }

    if (path === "/upload-cf-images" && request.method === "POST") {
      if (!env.CF_ACCOUNT_ID || !env.CF_IMAGES_TOKEN) {
        return json(
          {
            ok: false,
            success: false,
            error: "Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN on worker",
          },
          503
        );
      }
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file.stream !== "function") {
        return json({ ok: false, success: false, error: "No file" }, 400);
      }

      const cfForm = new FormData();
      cfForm.append("file", file, file.name || "upload.jpg");

      let cfRes;
      try {
        cfRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`,
          { method: "POST", headers: { Authorization: `Bearer ${env.CF_IMAGES_TOKEN}` }, body: cfForm }
        );
      } catch (e) {
        return json(
          {
            ok: false,
            success: false,
            error: `Gọi Cloudflare Images thất bại: ${e?.message || String(e)}`,
          },
          502
        );
      }

      const cfRaw = await cfRes.text();
      let cfData = {};
      try {
        cfData = cfRaw ? JSON.parse(cfRaw) : {};
      } catch {
        return json(
          {
            ok: false,
            success: false,
            error: `Cloudflare API không trả JSON (HTTP ${cfRes.status}). Body: ${cfRaw.slice(0, 180)}`,
          },
          502
        );
      }

      if (!cfData.success) {
        const errMsg =
          cfData.errors != null ? JSON.stringify(cfData.errors) : cfRes.statusText || "CF Images error";
        return json({ ok: false, success: false, error: errMsg }, cfRes.ok ? 500 : cfRes.status || 500);
      }

      const r = cfData.result || {};
      const variants = Array.isArray(r.variants) ? r.variants : [];
      const variantStrings = variants.filter((v) => typeof v === "string" && /^https?:\/\//i.test(v.trim()));
      let imageUrl =
        variantStrings.find((v) => v.endsWith("/public")) ||
        variantStrings[0] ||
        variants.find((v) => typeof v === "string" && v.endsWith("/public")) ||
        (typeof variants[0] === "string" ? variants[0] : "") ||
        "";

      const deliveryHash = env.CF_IMAGES_DELIVERY_HASH || env.CF_IMAGE_ACCOUNT_HASH;
      if (!imageUrl && typeof r.id === "string" && deliveryHash) {
        imageUrl = `https://imagedelivery.net/${deliveryHash}/${r.id}/public`;
      }

      if (!imageUrl || typeof imageUrl !== "string") {
        return json(
          {
            ok: false,
            success: false,
            error:
              "Cloudflare không trả URL ảnh (thiếu variants). Kiểm tra CF_IMAGES_TOKEN hoặc CF_IMAGES_DELIVERY_HASH.",
          },
          502
        );
      }

      return json({ ok: true, success: true, url: imageUrl.trim() });
    }

    if (path === "/delete-cf-image" && request.method === "POST") {
      if (!env.CF_ACCOUNT_ID || !env.CF_IMAGES_TOKEN) {
        return json({ ok: false, success: false, error: "Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN" }, 503);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, success: false, error: "Invalid JSON" }, 400);
      }
      const imageId = body?.imageId;
      if (!imageId) return json({ ok: false, success: false, error: "No imageId" }, 400);

      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1/${encodeURIComponent(imageId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${env.CF_IMAGES_TOKEN}` } }
      );
      const cfData = await cfRes.json().catch(() => ({}));
      return json({ ok: Boolean(cfData.success), success: Boolean(cfData.success) });
    }

    if (path.startsWith("/supabase/")) {
      const table = path.replace("/supabase/", "");
      if (!env.SUPABASE_URL) return json({ ok: false, error: "Missing SUPABASE_URL" }, 503);
      const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
      if (!serviceKey) return json({ ok: false, error: "Missing Supabase keys" }, 503);

      const supaUrl = `${env.SUPABASE_URL}/rest/v1/${table}${url.search}`;
      const method = request.method;
      const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
      const prefer =
        method === "POST" ? "return=representation" : method === "PATCH" ? "return=representation" : "";

      const supaRes = await fetch(supaUrl, {
        method,
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          ...(prefer ? { Prefer: prefer } : {}),
        },
        body: isWrite ? await request.text() : undefined,
      });

      const raw = await supaRes.text();
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        return json(parsed, supaRes.status);
      } catch {
        return json(
          {
            ok: false,
            error: "Supabase trả body không phải JSON",
            status: supaRes.status,
            preview: raw.slice(0, 200),
          },
          502
        );
      }
    }

    if (!path.startsWith("/api/")) {
      return json({ ok: false, error: "Not found", path }, 404);
    }

    const parts = path.replace("/api/", "").split("/");
    const baseId = parts[0];
    const table = parts.slice(1).join("/");

    let token;
    if (baseId === BASE_ID_HV || baseId === BASE_ID_CHAT) token = env.AIRTABLE_TOKEN;
    else if (baseId === BASE_ID_TC) token = env.AIRTABLE_TOKEN_TC;
    else if (baseId === BASE_ID_NS) token = env.AIRTABLE_TOKEN_NS;
    else return unauthorized();

    if (!token) return json({ ok: false, error: "Missing Airtable token for this base" }, 503);

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${table}${url.search}`;

    if (request.method === "GET") {
      const ttl = getTTL(baseId, table);

      if (ttl > 0 && env.CACHE) {
        const cacheKey = makeCacheKey(baseId, table, url.search);
        const hit = await kvGet(env.CACHE, cacheKey);

        if (hit) {
          const age = Math.floor((Date.now() - hit.cachedAt) / 1000);
          return new Response(JSON.stringify(hit.data), {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json; charset=utf-8",
              "X-Cache": "HIT",
              "X-Cache-Age": String(age),
            },
          });
        }

        const res = await fetch(airtableUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await res.json();

        if (res.ok) {
          env.CACHE.put(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }), {
            expirationTtl: ttl,
          }).catch(() => {});
        }

        return new Response(JSON.stringify(data), {
          status: res.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", "X-Cache": "MISS" },
        });
      }

      const res = await fetch(airtableUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8", "X-Cache": "BYPASS" },
      });
    }

    if (["POST", "PATCH", "DELETE"].includes(request.method)) {
      const res = await fetch(airtableUrl, {
        method: request.method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: await request.text(),
      });
      const data = await res.json();

      if (res.ok && env.CACHE) {
        const prefix = makeCacheKey(baseId, table, "");
        kvInvalidatePrefix(env.CACHE, prefix).catch(() => {});
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json; charset=utf-8" },
      });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Messenger Agent — Claude + agent-context (KV binding "KV")
// ═══════════════════════════════════════════════════════════════════════════

async function processMessengerMessage({ sender_id, text }, env) {
  if (!env.KV) {
    console.error("Messenger: missing KV binding");
    return;
  }
  const key = `session:${sender_id}`;
  let session = { history: [], agent_active: true };
  try {
    const raw = await env.KV.get(key);
    if (raw) session = JSON.parse(raw);
  } catch (e) {
    console.error("KV:", e.message);
  }

  if (!session.agent_active) {
    await agentLog({ sender_id, role: "user", message: text, env });
    return;
  }

  await agentLog({ sender_id, role: "user", message: text, env });

  const ctx_data = await getAgentContext(env);

  const reply = await callClaude({ text, session, sender_id, ctx_data, env });

  const extras = pickMatchedFaqAttachments(text, reply.text, ctx_data.faq ?? []);
  let replyForUser = reply.text;
  if (extras?.images?.length) replyForUser = stripMatchedImageUrlsFromText(replyForUser, extras.images);
  if (extras?.links?.length) replyForUser = stripMatchedLinkUrlsFromText(replyForUser, extras.links);
  replyForUser = stripMarkdownBold(replyForUser);
  if (!String(replyForUser || "").trim()) replyForUser = "…";
  const replyChunks = buildReplyPartsForChat(replyForUser, extras || undefined);
  const combinedForHistory = replyChunks.join("\n\n");

  session.history = [
    ...(session.history ?? []),
    { role: "user", content: text },
    { role: "assistant", content: combinedForHistory },
  ].slice(-20);

  try {
    await env.KV.put(key, JSON.stringify(session), { expirationTtl: 86400 });
  } catch {}

  await agentLog({ sender_id, role: "agent", message: combinedForHistory, env });
  for (let ci = 0; ci < replyChunks.length; ci++) {
    console.log(
      "Messenger:",
      JSON.stringify(await sendMessengerReply(sender_id, replyChunks[ci], env)),
    );
    if (ci < replyChunks.length - 1) await new Promise((r) => setTimeout(r, 420));
  }

  if (extras && (extras.images.length || extras.links.length)) {
    console.log("Messenger extras:", JSON.stringify(await sendMessengerExtras(sender_id, extras, env)));
  }

  if (reply.escalated) {
    session.agent_active = false;
    try {
      await env.KV.put(key, JSON.stringify(session), { expirationTtl: 86400 });
    } catch {}
  }
}

async function getAgentContext(env) {
  try {
    const c = await env.KV.get("agent_ctx");
    if (c) return JSON.parse(c);
  } catch {}

  for (const rawUrl of SITE_CONTEXT_URLS) {
    try {
      const ctxUrl = new URL(rawUrl);
      ctxUrl.searchParams.set("_cb", String(Date.now()));
      const res = await fetch(ctxUrl.toString(), {
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const data = await res.json();
      console.log(`CTX: ${rawUrl} → ${data.faq?.length ?? 0} FAQ, ${data.available_classes?.length ?? 0} classes`);
      try {
        await env.KV.put("agent_ctx", JSON.stringify(data), { expirationTtl: 60 });
      } catch {}
      return data;
    } catch (e) {
      console.log(`CTX fail ${ctxUrl}:`, e.message);
    }
  }

  console.error("No context available");
  return { system_prompt: null, faq: [], available_classes: [], dh_exam_profiles: [] };
}

async function callClaude({ text, session, sender_id, ctx_data, env }) {
  const messages = [...(session.history ?? []), { role: "user", content: text }];
  const systemPrompt = buildSystemPrompt(ctx_data);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools: buildTools(),
      messages,
    }),
  });

  if (!res.ok) {
    console.error("Claude:", res.status, await res.text());
    return { text: "Xin lỗi bạn, mình đang bận chút. Bạn nhắn lại sau ít phút nhé! 😊" };
  }

  const data = await res.json();
  console.log("stop_reason:", data.stop_reason);

  if (data.stop_reason === "tool_use") {
    return handleTools({ data, messages, systemPrompt, sender_id, ctx_data, env });
  }

  return { text: data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() };
}

async function handleTools({ data, messages, systemPrompt, sender_id, ctx_data, env }) {
  const results = [];
  let escalated = false;

  for (const block of data.content.filter((b) => b.type === "tool_use")) {
    console.log("Tool:", block.name);
    let result;
    if (block.name === "query_courses") result = await queryCourses(ctx_data, env);
    else if (block.name === "get_payment_link") result = getPaymentLink(block.input, sender_id);
    else if (block.name === "escalate_to_admin") {
      escalated = true;
      result = { success: true };
    }
    results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
  }

  const res2 = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools: buildTools(),
      messages: [...messages, { role: "assistant", content: data.content }, { role: "user", content: results }],
    }),
  });

  const d2 = await res2.json();
  return {
    text: d2.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim(),
    escalated,
  };
}

function buildTools() {
  return [
    {
      name: "query_courses",
      description: "Lấy danh sách khóa học còn chỗ. Gọi khi học viên hỏi về khóa học, lịch học, hoặc muốn đăng ký.",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "get_payment_link",
      description: "Tạo link đăng ký khi học viên đồng ý đăng ký một khóa học cụ thể.",
      input_schema: {
        type: "object",
        properties: {
          course_id: { type: "string" },
          class_id: { type: "string" },
        },
        required: ["course_id"],
      },
    },
    {
      name: "escalate_to_admin",
      description: "Chuyển cho nhân viên thật khi: hỏi giảm giá, khiếu nại, hóa đơn VAT, yêu cầu đặc biệt.",
      input_schema: {
        type: "object",
        properties: {
          reason: { type: "string" },
          summary: { type: "string" },
        },
        required: ["reason"],
      },
    },
  ];
}

async function queryCourses(ctx_data, env) {
  if (ctx_data.available_classes?.length > 0) {
    return { courses: ctx_data.available_classes.slice(0, 5) };
  }
  try {
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/tc_lop_hoc?select=id,ten_lop,hoc_phi,lich_hoc,con_cho,tc_khoa_hoc(ten_khoa,mon_hoc)&con_cho=gt.0&limit=5`,
      { headers: sbHeaders(env) }
    );
    const courses = await res.json();
    if (Array.isArray(courses) && courses.length > 0) return { courses };
  } catch (e) {
    console.error("Supabase query:", e.message);
  }
  return { courses: [], note: "Hiện không lấy được danh sách lớp." };
}

function getPaymentLink(input, sender_id) {
  const p = new URLSearchParams({
    khoa: input.course_id,
    ...(input.class_id && { lop: input.class_id }),
    ref: "agent_fb",
    sid: sender_id.slice(-6),
  });
  return { url: `${PAYMENT_BASE}/thanhtoan?${p}` };
}

function formatFaqEntry(f) {
  const q = f.question ?? "";
  const a = f.answer ?? "";
  const lines = [`Q: ${q}`, `A: ${a}`];
  const att = f.attachments;
  if (!att || typeof att !== "object") return lines.join("\n");

  const imgs = Array.isArray(att.images) ? att.images.filter((u) => typeof u === "string" && u.trim()) : [];
  const links = Array.isArray(att.links) ? att.links : [];
  const extra = [];
  if (imgs.length) {
    extra.push(`Đính kèm ảnh (URL — có thể gửi học viên khi phù hợp): ${imgs.join(" | ")}`);
  }
  if (links.length) {
    const linkStr = links
      .map((l) => {
        if (!l || typeof l !== "object") return "";
        const u = typeof l.url === "string" ? l.url.trim() : "";
        if (!u) return "";
        const lb = typeof l.label === "string" ? l.label.trim() : "";
        return lb ? `${lb}: ${u}` : u;
      })
      .filter(Boolean)
      .join(" | ");
    if (linkStr) extra.push(`Link tham chiếu: ${linkStr}`);
  }
  if (extra.length) lines.push(extra.join("\n"));
  return lines.join("\n");
}

const MESSENGER_VI_STOP = new Set([
  "là",
  "gì",
  "có",
  "cho",
  "và",
  "một",
  "các",
  "với",
  "không",
  "nào",
  "thì",
  "được",
  "theo",
  "như",
  "hay",
  "ở",
  "học",
  "phí",
  "lớp",
  "khóa",
]);

function parseAttachmentsForPick(att) {
  if (!att || typeof att !== "object") return null;
  const images = Array.isArray(att.images)
    ? [
        ...new Set(
          att.images
            .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
            .map((u) => u.trim()),
        ),
      ]
    : [];
  const linksRaw = Array.isArray(att.links) ? att.links : [];
  const links = [];
  for (const l of linksRaw) {
    if (!l || typeof l !== "object") continue;
    const u = typeof l.url === "string" ? l.url.trim() : "";
    if (!u || !/^https?:\/\//i.test(u)) continue;
    const lb = typeof l.label === "string" ? l.label.trim() : "";
    links.push(lb ? { label: lb, url: u } : { url: u });
  }
  if (!images.length && !links.length) return null;
  return { images, links };
}

function pickMatchedFaqAttachments(userText, replyText, faq) {
  const um = (userText || "").toLowerCase().trim();
  const ar = (replyText || "").toLowerCase();
  const mergedImages = new Set();
  const mergedLinks = [];
  for (const row of faq ?? []) {
    const parsed = parseAttachmentsForPick(row.attachments);
    if (!parsed) continue;
    const q = (row.question || "").toLowerCase().trim();
    const ans = (row.answer || "").toLowerCase();
    let relevant = false;
    if (q.length >= 4 && um.length >= 4) {
      if (um.includes(q.slice(0, Math.min(60, q.length)))) relevant = true;
      if (!relevant && q.includes(um.slice(0, Math.min(40, um.length)))) relevant = true;
    }
    if (!relevant && q.length >= 6) {
      const words = q.split(/\s+/).filter((w) => w.length > 2 && !MESSENGER_VI_STOP.has(w));
      relevant = words.some((w) => um.includes(w));
    }
    if (!relevant && ans.length >= 20) {
      const prefix = ans.slice(0, 60);
      relevant = ar.includes(prefix.slice(0, Math.min(40, prefix.length)));
    }
    if (!relevant) continue;
    for (const im of parsed.images) mergedImages.add(im);
    for (const l of parsed.links) {
      if (!mergedLinks.some((x) => x.url === l.url)) mergedLinks.push(l);
    }
  }
  if (!mergedImages.size && !mergedLinks.length) return null;
  return { images: [...mergedImages], links: mergedLinks };
}

function isLikelyImageUrlIntroLine(line) {
  return /(?:gửi|gởi).*ảnh|ảnh\s+(?:thông\s+tin|chi\s+tiết|minh\s+họa)|link\s+(?:ảnh|hình)|hình\s+minh\s+họa/i.test(
    line,
  );
}

/** Giống `stripMatchedImageUrlsFromText` phía Next — bỏ URL ảnh khỏi chữ khi đã gửi attachment ảnh. */
function stripMatchedImageUrlsFromText(text, imageUrls) {
  if (!imageUrls?.length) return text;
  let out = text;
  for (const raw of imageUrls) {
    const u = (raw || "").trim();
    if (!u) continue;
    out = out.replace(new RegExp(u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  }
  out = out.replace(/`{1,3}\s*`{1,3}/g, " ");
  out = out.replace(/[ \t]+/g, " ");
  const lines = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^[:-–—•\s]+$/.test(l)) return false;
      const t = l.replace(/\s+/g, " ");
      if (/:\s*$/.test(t) && isLikelyImageUrlIntroLine(t)) return false;
      return true;
    });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isLikelyBareLinkIntroLine(line) {
  const t = line.replace(/\s+/g, " ").trim();
  return /xem\s+(thêm\s+)?(chi\s+tiết|thông\s+tin)|lịch\s+học|tại\s+đây|tham\s+khảo|đường\s+dẫn|link\s+(web|này)/i.test(
    t,
  );
}

function stripMatchedLinkUrlsFromText(text, links) {
  if (!links?.length) return text;
  let out = text;
  for (const l of links) {
    const u = typeof l.url === "string" ? l.url.trim() : "";
    if (!u) continue;
    out = out.replace(new RegExp(u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
  }
  out = out.replace(/[ \t]+/g, " ");
  const lines = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      if (/^[:-–—•\s]+$/.test(l)) return false;
      const t = l.replace(/\s+/g, " ");
      if (/:\s*$/.test(t) && isLikelyBareLinkIntroLine(t)) return false;
      return true;
    });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function stripMarkdownBold(text) {
  let out = text;
  let prev = "";
  while (prev !== out) {
    prev = out;
    out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  }
  return out.replace(/\*\*/g, "");
}

const CHUNK_MAX = 300;

function splitAgentReplyIntoChatParts(text, maxChunk = CHUNK_MAX) {
  const cleaned = (text || "").trim();
  if (!cleaned) return ["…"];

  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const segments = [];

  for (const block of paragraphs) {
    if (block.length <= maxChunk) {
      segments.push(block);
      continue;
    }
    const sentences = block.split(/(?<=[.!?…])\s+/u).filter(Boolean);
    let buf = "";
    for (const s of sentences) {
      const next = buf ? `${buf} ${s}` : s;
      if (next.length <= maxChunk || !buf) buf = next;
      else {
        segments.push(buf.trim());
        buf = s;
      }
    }
    if (buf.trim()) segments.push(buf.trim());
  }

  const merged = [];
  for (const p of segments) {
    const t = p.trim();
    if (
      merged.length > 0 &&
      t.length < 40 &&
      merged[merged.length - 1].length + t.length + 2 <= maxChunk
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${t}`;
    } else {
      merged.push(t);
    }
  }

  return merged.length > 0 ? merged : [cleaned];
}

const ATTACHMENT_INVITE_BUBBLE =
  "Mình gửi bạn thêm thông tin để bạn tham khảo nha, cần gì thì hỏi mình thêm!";

const REFERENCE_TAIL_PARA =
  /xem\s+(thêm\s+)?(chi\s+tiết|thông\s+tin)|tại\s+đây\b|tham\s+khảo\s+tại|lịch\s+học\s+tại|https?:\/\/|đường\s+dẫn/i;

function paragraphLooksLikeReferenceTail(p) {
  const t = p.trim();
  if (REFERENCE_TAIL_PARA.test(t)) return true;
  if (t.length < 240 && /\bbạn\s+có\s+thể\s+xem\b/i.test(t)) return true;
  return false;
}

function extractCoreBeforeReferenceSentence(paragraph) {
  const re =
    /\s+(?=Bạn\s+có\s+thể\s+xem\b)|\s+(?=xem\s+thêm\s+chi\s+tiết)|\s+(?=chi\s+tiết\s+về\s+lịch)|\s+(?=thông\s+tin\s+chi\s+tiết)/i;
  const m = paragraph.match(re);
  if (!m || m.index === undefined || m.index === 0) return paragraph.trim();
  return paragraph.slice(0, m.index).trim();
}

function buildReplyPartsForChat(text, attachments) {
  const cleaned = (text || "").trim();
  if (!cleaned) return ["…"];

  const hasAtt =
    attachments &&
    ((attachments.images || []).length > 0 || (attachments.links || []).length > 0);

  if (!hasAtt) {
    return splitAgentReplyIntoChatParts(cleaned);
  }

  const paras = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  let coreText = "";

  if (paras.length >= 2) {
    const coreParas = [];
    for (const p of paras) {
      if (paragraphLooksLikeReferenceTail(p)) break;
      coreParas.push(p);
    }
    coreText = coreParas.join("\n\n").trim();
  }

  if (!coreText && paras.length === 1) {
    coreText = extractCoreBeforeReferenceSentence(paras[0]);
  }

  if (!coreText) {
    const nonTail = paras.filter((p) => !paragraphLooksLikeReferenceTail(p));
    coreText = nonTail.join("\n\n").trim() || paras[0] || cleaned;
  }

  if (paragraphLooksLikeReferenceTail(coreText) && paras.length > 1) {
    coreText =
      paras.filter((p) => !paragraphLooksLikeReferenceTail(p)).join("\n\n").trim() ||
      extractCoreBeforeReferenceSentence(paras[0]);
  }

  const trimmedCore = coreText.trim() || cleaned;
  const coreChunks = splitAgentReplyIntoChatParts(trimmedCore);

  return [...coreChunks, ATTACHMENT_INVITE_BUBBLE];
}

async function sendMessengerExtras(recipient_id, extras, env) {
  const images = (extras.images || []).slice(0, 6);
  const links = extras.links || [];
  const results = [];
  for (const url of images) {
    const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: env.PAGE_TOKEN,
        recipient: { id: recipient_id },
        messaging_type: "RESPONSE",
        message: {
          attachment: {
            type: "image",
            payload: { url, is_reusable: true },
          },
        },
      }),
    });
    results.push(await res.json());
    await new Promise((r) => setTimeout(r, 120));
  }
  if (links.length) {
    const text = links
      .map((l) => (l.label ? `${l.label}: ${l.url}` : l.url))
      .join("\n")
      .slice(0, 2000);
    results.push(await sendMessengerReply(recipient_id, text, env));
  }
  return results;
}

function buildSystemPrompt(ctx_data) {
  const base =
    ctx_data.system_prompt ??
    `Bạn là Sơn — tư vấn viên Sine Art (TP.HCM). Chỉ tiếng Việt.
Giọng nhắn tin thật (Zalo/Messenger): ngắn, "mình/bạn", có thể nói "chờ chút", "check", "nha", "Cho mình hỏi". Tránh giọng bot: không "Để mình check lịch lớp còn chỗ cho bạn nhé" kiểu khô; không "Theo thông tin", "Tóm lại", "Rất vui được hỗ trợ". Có thể tách vài ý: một tin xin chờ / nhận ý, tin sau hỏi cụ thể (thứ mấy, giờ nào).
Không nhận là AI. Gọi query_courses khi cần lớp còn chỗ. Escalate khi hỏi giảm giá đặc biệt hoặc khiếu nại.`;

  const noMd =
    "\n- Không dùng markdown: không viết ** hoặc __ để in đậm; giá ghi bình thường (vd: 550k).";
  const faq = ctx_data.faq ?? [];
  if (faq.length === 0) return `${base}${noMd}`;

  const faqText = faq.map(formatFaqEntry).join("\n\n");
  return `${base}${noMd}\n\nKNOWLEDGE BASE — ưu tiên dùng trước khi gọi tool:\n${faqText}`;
}

function sbHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };
}

async function agentLog({ sender_id, role, message, env }) {
  if (!env.SUPABASE_URL?.trim()) {
    console.error(
      "Log: thiếu secret SUPABASE_URL trên Worker — thêm trong Dashboard → Workers → sine-art-api → Settings → Variables, hoặc: wrangler secret put SUPABASE_URL",
    );
    return;
  }
  if (!env.SUPABASE_SERVICE_KEY?.trim()) {
    console.error(
      "Log: thiếu SUPABASE_SERVICE_KEY — cần service_role để ghi ag_conversation_log (wrangler secret put SUPABASE_SERVICE_KEY)",
    );
    return;
  }
  try {
    await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/ag_conversation_log`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...sbHeaders(env), Prefer: "return=minimal" },
      body: JSON.stringify({ sender_id, channel: "messenger", role, message }),
    });
  } catch (e) {
    console.error("Log:", e.message);
  }
}

async function sendMessengerReply(recipient_id, text, env) {
  const res = await fetch("https://graph.facebook.com/v19.0/me/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: env.PAGE_TOKEN,
      recipient: { id: recipient_id },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });
  return res.json();
}

async function verifyFbSignature(body, signature, appSecret) {
  if (!appSecret) return true;
  if (!signature.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const actual = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return actual === signature.slice("sha256=".length);
}
