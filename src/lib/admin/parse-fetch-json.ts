/**
 * Đọc body fetch một lần; parse JSON hoặc báo lỗi rõ (413 / HTML proxy không phải JSON).
 */
export async function readResponseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    const flat = text.replace(/\s+/g, " ").trim();
    const snippet = flat.slice(0, 180);

    if (
      res.status === 413 ||
      /entity too large|request.*too large|payload too large|body exceeded/i.test(flat)
    ) {
      throw new Error(
        "Ảnh vượt giới hạn gói tin máy chủ (thường ~4MB mỗi ảnh trên Vercel). Nén file hoặc chọn ảnh nhỏ hơn.",
      );
    }

    throw new Error(
      snippet
        ? `Phản hồi không phải JSON (${res.status}): ${snippet}`
        : `Phản hồi rỗng (${res.status}).`,
    );
  }
}
