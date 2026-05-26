import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { buildVietQrImageUrl } from "@/lib/payment/vietqr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePosInt(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function parseNonNegInt(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

/**
 * Proxy ảnh QR VietQR (TPBank) — đảm bảo client cùng origin nên có thể fetch
 * vào `Blob` để ghi vào clipboard. Auth qua admin session để tránh public abuse.
 *
 * Query: `donId`, `maDonSo`, `amount` (VND, integer ≥ 0).
 */
export async function GET(req: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const donId = parsePosInt(url.searchParams.get("donId"));
  const maDonSo = (url.searchParams.get("maDonSo") ?? "").trim();
  const amount = parseNonNegInt(url.searchParams.get("amount"));

  if (donId == null || !maDonSo || amount == null) {
    return new Response("Bad params", { status: 400 });
  }

  const upstream = buildVietQrImageUrl(maDonSo, amount, donId);

  let res: Response;
  try {
    res = await fetch(upstream, { cache: "no-store" });
  } catch {
    return new Response("Upstream fetch failed", { status: 502 });
  }

  if (!res.ok) {
    return new Response(`Upstream ${res.status}`, { status: 502 });
  }

  const buf = await res.arrayBuffer();
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/png",
      "Cache-Control": "private, max-age=60",
    },
  });
}
