import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/** Cookie đồng bộ GV từ Phòng học (localStorage) → SSR nhận được `hr_nhan_su.id`. */
export const GV_SYNC_COOKIE = "sine_gv_sync";

const TTL_SEC_DEFAULT = 60 * 60 * 24 * 14; // 14 ngày

function getSigningSecret(): string | null {
  const s =
    process.env.HV_SESSION_SIGNING_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  return s.length > 0 ? s : null;
}

/** Ký token: `gv.hrId.expUnix.sigHex` — prefix `gv` để không nhầm với cookie HV. */
export function signGvSessionToken(hrId: number, ttlSec: number = TTL_SEC_DEFAULT): string | null {
  const secret = getSigningSecret();
  if (!secret || !Number.isFinite(hrId) || hrId <= 0) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `gv.${hrId}.${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyGvSessionToken(token: string): number | null {
  const secret = getSigningSecret();
  if (!secret || !token?.trim()) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "gv") return null;
  const hrId = Number(parts[1]);
  const exp = Number(parts[2]);
  const sig = parts[3];
  if (!Number.isFinite(hrId) || hrId <= 0 || !Number.isFinite(exp)) return null;
  if (Math.floor(Date.now() / 1000) > exp) return null;
  const payload = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return hrId;
}

/** Đọc cookie GV đã ký — trả `hr_nhan_su.id` nếu hợp lệ, null nếu không có / sai chữ ký / hết hạn. */
export async function getGvHrIdFromSyncedCookie(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(GV_SYNC_COOKIE)?.value;
  if (!raw) return null;
  return verifyGvSessionToken(raw);
}
