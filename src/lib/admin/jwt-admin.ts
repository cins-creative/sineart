import { SignJWT, jwtVerify } from "jose";

import {
  ADMIN_PWD_RESET_JWT_TYP,
  ADMIN_PWD_SETUP_JWT_TYP,
  ADMIN_SESSION_JWT_TYP,
} from "@/lib/admin/constants";

function getSecretKey(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET is required (min 32 characters).");
  }
  return new TextEncoder().encode(s);
}

/** Kiểm tra cấu hình trước khi ký JWT (tránh nuốt lỗi im lặng ở forgot-password). */
export function isAdminJwtSecretConfigured(): boolean {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  return Boolean(s && s.length >= 32);
}

export type AdminSessionPayload = {
  staffId: number;
  email: string;
  name: string;
};

export async function signAdminSessionToken(p: AdminSessionPayload): Promise<string> {
  return new SignJWT({
    typ: ADMIN_SESSION_JWT_TYP,
    email: p.email,
    name: p.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(p.staffId))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyAdminSessionToken(
  token: string | undefined
): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    if (payload.typ !== ADMIN_SESSION_JWT_TYP) return null;
    const sub = Number(payload.sub);
    if (!Number.isFinite(sub) || sub <= 0) return null;
    return {
      staffId: sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export async function signPasswordActionToken(params: {
  staffId: number;
  typ: typeof ADMIN_PWD_RESET_JWT_TYP | typeof ADMIN_PWD_SETUP_JWT_TYP;
}): Promise<string> {
  return new SignJWT({ typ: params.typ })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(params.staffId))
    .setIssuedAt()
    .setExpirationTime("2h")
    .setJti(crypto.randomUUID())
    .sign(getSecretKey());
}

export type PasswordActionTyp =
  | typeof ADMIN_PWD_RESET_JWT_TYP
  | typeof ADMIN_PWD_SETUP_JWT_TYP;

export async function verifyPasswordActionToken(
  token: string
): Promise<{ staffId: number; typ: PasswordActionTyp } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const typ = payload.typ;
    if (typ !== ADMIN_PWD_RESET_JWT_TYP && typ !== ADMIN_PWD_SETUP_JWT_TYP) return null;
    const sub = Number(payload.sub);
    if (!Number.isFinite(sub) || sub <= 0) return null;
    return { staffId: sub, typ };
  } catch {
    return null;
  }
}
