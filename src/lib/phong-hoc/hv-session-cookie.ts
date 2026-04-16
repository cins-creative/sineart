import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/** Cookie đồng bộ HV từ Phòng học (localStorage) → SSR nhận được email / id. */
export const HV_SYNC_COOKIE = "sine_hv_sync";

const TTL_SEC_DEFAULT = 60 * 60 * 24 * 14; // 14 ngày

function getSigningSecret(): string | null {
  const s =
    process.env.HV_SESSION_SIGNING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  return s.length > 0 ? s : null;
}

/** Ký token: `hvId.expUnix.sigHex` */
export function signHvSessionToken(hvId: number, ttlSec: number = TTL_SEC_DEFAULT): string | null {
  const secret = getSigningSecret();
  if (!secret || !Number.isFinite(hvId) || hvId <= 0) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${hvId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyHvSessionToken(token: string): number | null {
  const secret = getSigningSecret();
  if (!secret || !token?.trim()) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;
  const hvId = Number(parts[0]);
  const exp = Number(parts[1]);
  const sig = parts[2];
  if (!Number.isFinite(hvId) || hvId <= 0 || !Number.isFinite(exp)) return null;
  if (Math.floor(Date.now() / 1000) > exp) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return hvId;
}

/**
 * Đọc cookie đã ký (App Router — cookies async).
 * @returns `ql_thong_tin_hoc_vien.id` nếu hợp lệ.
 */
export async function getHvIdFromSyncedCookie(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(HV_SYNC_COOKIE)?.value;
  if (!raw) return null;
  return verifyHvSessionToken(raw);
}
