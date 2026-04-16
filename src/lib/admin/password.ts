import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function isPasswordStrongEnough(plain: string): boolean {
  return plain.length >= 8;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * So khớp mật khẩu với giá trị cột `hr_nhan_su.password`.
 * Hỗ trợ bcrypt (`$2…`) hoặc chuỗi thô (legacy): nếu khớp legacy thì caller nên ghi lại bcrypt.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (stored == null) return false;
  const s = String(stored).trim();
  if (s === "") return false;
  if (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$")) {
    return bcrypt.compare(plain, s);
  }
  return plain === s;
}
