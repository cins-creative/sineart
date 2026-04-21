/**
 * Sine Art — Cloudflare Worker (full)
 *
 * ── Wrangler (wrangler.toml) ─────────────────────────────────────────────
 * main = "workers/sine-art-api/index.mjs"
 * compatibility_date = "2024-09-01"
 *
 * [[r2_buckets]]
 * binding = "R2"
 * bucket_name = "<tên-bucket-R2>"
 *
 * [[kv_namespaces]]
 * binding = "CACHE"
 * id = "<kv_id>"
 *
 * Secrets (wrangler secret put <NAME>):
 *   API_SECRET              — bắt buộc; trùng với SINE_ART_WORKER_SECRET trên Vercel (header x-api-secret)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY    — khuyến nghị cho webhook / supabase proxy ghi
 *   SUPABASE_ANON_KEY       — fallback nếu không có SERVICE
 *   CF_ACCOUNT_ID
 *   CF_IMAGES_TOKEN         — Cloudflare Images API token
 *   AIRTABLE_TOKEN
 *   AIRTABLE_TOKEN_TC
 *   AIRTABLE_TOKEN_NS
 *
 * ── Next.js (Vercel) ───────────────────────────────────────────────────────
 *   SINE_ART_WORKER_SECRET = <cùng giá trị API_SECRET>
 *   SINE_ART_WORKER_URL    = https://<worker>.<subdomain>.workers.dev (nếu khác mặc định trong app)
 */

// ─── Cache TTL (giây) ─────────────────────────────────────────────────────
const CACHE_TTL = {
  DEFAULT: 60,
  BAIHOC: 300,
  HOCVIEN: 60,
  CHAT: 12,
  GALLERY: 120,
  NHANSU: 300,
  TAICHINH: 300,
}

const BASE_ID_HV = "applkO11hIay1KpY3"
const BASE_ID_CHAT = "appwJkrACYCXb27BS"
const BASE_ID_TC = "app2YEqcyFtSQLb67"
const BASE_ID_NS = "app6ZBzaX4WB446Qj"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-secret",
}

function getTTL(baseId, table) {
  if (baseId === BASE_ID_CHAT) return CACHE_TTL.CHAT
  const t = String(table).toLowerCase()
  if (t.includes("bai") || t.includes("lesson")) return CACHE_TTL.BAIHOC
  if (t.includes("hoc") || t.includes("student")) return CACHE_TTL.HOCVIEN
  if (t.includes("gallery") || t.includes("anh")) return CACHE_TTL.GALLERY
  if (baseId === BASE_ID_NS) return CACHE_TTL.NHANSU
  if (baseId === BASE_ID_TC) return CACHE_TTL.TAICHINH
  return CACHE_TTL.DEFAULT
}

// ─── KV helpers ─────────────────────────────────────────────────────────────
function makeCacheKey(baseId, table, search) {
  const raw = `at:${baseId}:${table}${search || ""}`
  return raw.length <= 512 ? raw : raw.slice(0, 512)
}

async function kvGet(kv, key) {
  try {
    const raw = await kv.get(key, { type: "text" })
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function kvInvalidatePrefix(kv, prefix) {
  try {
    const list = await kv.list({ prefix, limit: 100 })
    if (!list.keys.length) return
    await Promise.all(list.keys.map((k) => kv.delete(k.name)))
  } catch {
    /* invalidation fail → cache tự expire */
  }
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extra },
  })
}

function unauthorized() {
  return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS })
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default {
  /**
   * @param {Request} request
   * @param {{ API_SECRET?: string; SUPABASE_URL?: string; SUPABASE_SERVICE_KEY?: string; SUPABASE_ANON_KEY?: string; CF_ACCOUNT_ID?: string; CF_IMAGES_TOKEN?: string; AIRTABLE_TOKEN?: string; AIRTABLE_TOKEN_TC?: string; AIRTABLE_TOKEN_NS?: string; R2?: R2Bucket; CACHE?: KVNamespace }} env
   */
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // Health (không cần secret)
    if (path === "/" || path === "/health") {
      return json({ ok: true, service: "sine-art-api" })
    }

    // ─── PUBLIC: file từ R2 ─────────────────────────────────────────────────
    if (path.startsWith("/images/")) {
      const key = path.replace("/images/", "")
      if (!key) return new Response("Not found", { status: 404, headers: CORS_HEADERS })

      if (request.method === "DELETE") {
        const secret = request.headers.get("x-api-secret")
        if (!secret || secret !== env.API_SECRET) return unauthorized()
        if (!env.R2) return json({ error: "R2 not bound" }, 503)
        await env.R2.delete(key)
        return json({ success: true })
      }

      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS })
      }

      if (!env.R2) return new Response("R2 not bound", { status: 503, headers: CORS_HEADERS })
      const object = await env.R2.get(key)
      if (!object) return new Response("Not found", { status: 404, headers: CORS_HEADERS })

      const headers = new Headers({
        ...CORS_HEADERS,
        "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000",
        ...(object.httpMetadata?.contentType?.startsWith("image/")
          ? {}
          : {
              "Content-Disposition": `attachment; filename="${key.split("_").slice(2).join("_") || key}"`,
            }),
      })
      return new Response(object.body, { headers })
    }

    // ─── WEBHOOK SEPAY (không auth) ─────────────────────────────────────────
    if (path === "/webhook/sepay" && request.method === "POST") {
      const SUPABASE_URL = env.SUPABASE_URL
      const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        return json({ error: "Missing SUPABASE_URL or keys" }, 503)
      }

      const sbH = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }

      let payload
      try {
        payload = await request.json()
      } catch {
        return new Response("Bad Request", { status: 400, headers: CORS_HEADERS })
      }

      if (payload.transferType !== "in") {
        return json({ skip: "not_incoming" })
      }

      const content = payload.content || ""
      const match = content.match(/SA\d{6}/i)
      const maDonSo = match ? match[0].toUpperCase() : null

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
      })

      if (!maDonSo) {
        return json({ ok: true, matched: false, reason: "no_ma_don" })
      }

      const donRes = await fetch(
        `${SUPABASE_URL}/rest/v1/hp_don_thu_hoc_phi?ma_don_so=eq.${encodeURIComponent(maDonSo)}&select=id,status`,
        { headers: sbH }
      )
      const donList = await donRes.json()
      const don = Array.isArray(donList) ? donList[0] : null

      if (!don) {
        return json({ ok: true, matched: false, reason: "don_not_found" })
      }

      if (don.status === "Đã thanh toán") {
        return json({ ok: true, matched: true, reason: "already_paid" })
      }

      const today = new Date().toISOString().split("T")[0]

      await fetch(`${SUPABASE_URL}/rest/v1/hp_don_thu_hoc_phi?id=eq.${don.id}`, {
        method: "PATCH",
        headers: sbH,
        body: JSON.stringify({
          status: "Đã thanh toán",
          ngay_thanh_toan: today,
        }),
      })

      await fetch(`${SUPABASE_URL}/rest/v1/hp_thu_hp_chi_tiet?don_thu=eq.${don.id}`, {
        method: "PATCH",
        headers: sbH,
        body: JSON.stringify({ status: "Đã thanh toán" }),
      })

      return json({ ok: true, matched: true, don_id: don.id })
    }

    // ─── Auth (mọi route bên dưới, trừ đã xử lý) ────────────────────────────
    const secret = request.headers.get("x-api-secret")
    if (!env.API_SECRET) {
      return json({ error: "Worker missing API_SECRET" }, 503)
    }
    if (secret !== env.API_SECRET) {
      return unauthorized()
    }

    // ─── PROXY FETCH-URL ─────────────────────────────────────────────────────
    // Next.js (Vercel) gọi endpoint này khi cần fetch HTML từ site bên ngoài mà
    // bị chặn IP datacenter Vercel (vd. blog WordPress có Cloudflare). Worker
    // đi qua network Cloudflare nên IP reputation tốt hơn.
    //
    // Body: { url: string, headers?: Record<string,string> }
    // Resp: { ok, status, statusText, contentType, html }
    if (path === "/fetch-url" && request.method === "POST") {
      let payload
      try {
        payload = await request.json()
      } catch {
        return json({ ok: false, error: "Invalid JSON body" }, 400)
      }
      const target = typeof payload?.url === "string" ? payload.url.trim() : ""
      if (!target || !/^https?:\/\//i.test(target)) {
        return json({ ok: false, error: "Invalid URL" }, 400)
      }
      const extraHeaders =
        payload?.headers && typeof payload.headers === "object" ? payload.headers : {}

      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua":
          '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        ...extraHeaders,
      }

      let upstream
      try {
        upstream = await fetch(target, {
          method: "GET",
          headers,
          redirect: "follow",
          cf: { cacheTtl: 0, cacheEverything: false },
        })
      } catch (e) {
        return json(
          { ok: false, error: `Upstream fetch failed: ${e?.message || String(e)}` },
          502
        )
      }

      const contentType = upstream.headers.get("content-type") ?? ""
      const html = await upstream.text()

      return json({
        ok: upstream.ok,
        status: upstream.status,
        statusText: upstream.statusText,
        contentType,
        finalUrl: upstream.url || target,
        html,
      })
    }

    // ─── UPLOAD R2 ───────────────────────────────────────────────────────────
    if (path === "/upload" && request.method === "POST") {
      if (!env.R2) return json({ error: "R2 not bound", success: false }, 503)
      const formData = await request.formData()
      const file = formData.get("file")
      if (!file || typeof file.stream !== "function") {
        return json({ error: "No file provided" }, 400)
      }
      const ext = (file.name && file.name.split(".").pop()) || "bin"
      const safeName = String(file.name || "file")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40)
      const key = `${Date.now()}_${safeName}.${ext}`
      await env.R2.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      })
      return json({
        success: true,
        url: `${url.origin}/images/${key}`,
        key,
        filename: file.name || key,
      })
    }

    // ─── UPLOAD Cloudflare Images (Next.js phòng học gọi route này) ──────────
    if (path === "/upload-cf-images" && request.method === "POST") {
      if (!env.CF_ACCOUNT_ID || !env.CF_IMAGES_TOKEN) {
        return json(
          { success: false, error: "Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN on worker" },
          503
        )
      }
      const formData = await request.formData()
      const file = formData.get("file")
      if (!file || typeof file.stream !== "function") {
        return json({ success: false, error: "No file" }, 400)
      }

      const cfForm = new FormData()
      cfForm.append("file", file, file.name || "upload.jpg")

      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`,
        { method: "POST", headers: { Authorization: `Bearer ${env.CF_IMAGES_TOKEN}` }, body: cfForm }
      )
      const cfData = await cfRes.json().catch(() => ({}))
      if (!cfData.success) {
        const errMsg =
          cfData.errors != null ? JSON.stringify(cfData.errors) : cfRes.statusText || "CF Images error"
        return json({ success: false, error: errMsg }, 500)
      }
      const variants = cfData.result?.variants || []
      const imageUrl = variants.find((v) => v.endsWith("/public")) || variants[0] || ""
      return json({ success: true, url: imageUrl })
    }

    // ─── DELETE Cloudflare Images ───────────────────────────────────────────
    if (path === "/delete-cf-image" && request.method === "POST") {
      if (!env.CF_ACCOUNT_ID || !env.CF_IMAGES_TOKEN) {
        return json({ success: false, error: "Missing CF_ACCOUNT_ID or CF_IMAGES_TOKEN" }, 503)
      }
      let body
      try {
        body = await request.json()
      } catch {
        return json({ success: false, error: "Invalid JSON" }, 400)
      }
      const imageId = body?.imageId
      if (!imageId) return json({ success: false, error: "No imageId" }, 400)

      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1/${encodeURIComponent(imageId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${env.CF_IMAGES_TOKEN}` } }
      )
      const cfData = await cfRes.json().catch(() => ({}))
      return json({ success: Boolean(cfData.success) })
    }

    // ─── Proxy Supabase REST ─────────────────────────────────────────────────
    if (path.startsWith("/supabase/")) {
      const table = path.replace("/supabase/", "")
      if (!env.SUPABASE_URL) return json({ error: "Missing SUPABASE_URL" }, 503)
      const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY
      if (!serviceKey) return json({ error: "Missing Supabase keys" }, 503)

      const supaUrl = `${env.SUPABASE_URL}/rest/v1/${table}${url.search}`
      const method = request.method
      const isWrite = ["POST", "PATCH", "PUT", "DELETE"].includes(method)
      const prefer =
        method === "POST" ? "return=representation" : method === "PATCH" ? "return=representation" : ""

      const supaRes = await fetch(supaUrl, {
        method,
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          ...(prefer ? { Prefer: prefer } : {}),
        },
        body: isWrite ? await request.text() : undefined,
      })

      return new Response(await supaRes.text(), {
        status: supaRes.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    // ─── Proxy Airtable ─────────────────────────────────────────────────────
    if (!path.startsWith("/api/")) {
      return new Response("Not found", { status: 404, headers: CORS_HEADERS })
    }

    const parts = path.replace("/api/", "").split("/")
    const baseId = parts[0]
    const table = parts.slice(1).join("/")

    let token
    if (baseId === BASE_ID_HV || baseId === BASE_ID_CHAT) token = env.AIRTABLE_TOKEN
    else if (baseId === BASE_ID_TC) token = env.AIRTABLE_TOKEN_TC
    else if (baseId === BASE_ID_NS) token = env.AIRTABLE_TOKEN_NS
    else return unauthorized()

    if (!token) return json({ error: "Missing Airtable token for this base" }, 503)

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${table}${url.search}`

    if (request.method === "GET") {
      const ttl = getTTL(baseId, table)

      if (ttl > 0 && env.CACHE) {
        const cacheKey = makeCacheKey(baseId, table, url.search)
        const hit = await kvGet(env.CACHE, cacheKey)

        if (hit) {
          const age = Math.floor((Date.now() - hit.cachedAt) / 1000)
          return new Response(JSON.stringify(hit.data), {
            status: 200,
            headers: {
              ...CORS_HEADERS,
              "Content-Type": "application/json",
              "X-Cache": "HIT",
              "X-Cache-Age": String(age),
            },
          })
        }

        const res = await fetch(airtableUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        })
        const data = await res.json()

        if (res.ok) {
          env.CACHE.put(cacheKey, JSON.stringify({ data, cachedAt: Date.now() }), {
            expirationTtl: ttl,
          }).catch(() => {})
        }

        return new Response(JSON.stringify(data), {
          status: res.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json", "X-Cache": "MISS" },
        })
      }

      const res = await fetch(airtableUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json", "X-Cache": "BYPASS" },
      })
    }

    if (["POST", "PATCH", "DELETE"].includes(request.method)) {
      const res = await fetch(airtableUrl, {
        method: request.method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: await request.text(),
      })
      const data = await res.json()

      if (res.ok && env.CACHE) {
        const prefix = makeCacheKey(baseId, table, "")
        kvInvalidatePrefix(env.CACHE, prefix).catch(() => {})
      }

      return new Response(JSON.stringify(data), {
        status: res.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      })
    }

    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS })
  },
}
