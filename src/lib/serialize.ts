/**
 * Đảm bảo dữ liệu truyền từ Server Component → Client Component
 * không chứa BigInt / kiểu không JSON-safe (tránh lỗi RSC / Turbopack).
 */
export function toJSONSafe<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}
