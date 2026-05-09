import type { SupabaseClient } from "@supabase/supabase-js";

/** Các nhãn môn thi hợp lệ — khớp giá trị lưu trong DB (`dh_truong_nganh.mon_thi`). */
export const DH_MON_THI_HOP_LE = [
  "Xét duyệt",
  "Hình họa khối cơ bản",
  "Hình họa tĩnh vật",
  "Hình họa tượng tròn",
  "Hình họa chân dung",
  "Hình họa toàn thân",
  "Trang trí màu",
  "Bố cục màu",
] as const;

/** Giới hạn khi lưu / hiển thị admin — môn tùy chỉnh được phép ngoài danh sách gợi ý. */
export const DH_MON_THI_ITEM_MAX_LEN = 80;
export const DH_MON_THI_ARRAY_MAX_COUNT = 40;

/** Giữ đúng chuỗi đã lưu trong DB (kể cả môn tùy chỉnh) — khớp admin Trường & ngành thi ĐH. */
function parseMonThiArrayPermissive(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    let t = x.trim();
    if (!t) continue;
    if (t.length > DH_MON_THI_ITEM_MAX_LEN) t = t.slice(0, DH_MON_THI_ITEM_MAX_LEN);
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= DH_MON_THI_ARRAY_MAX_COUNT) break;
  }
  return out;
}

export type DhExamProfileRow = {
  truong_id: number;
  ten_truong_dai_hoc: string;
  /** `dh_truong_dai_hoc.score` — thấp hơn = trường ưu tiên hơn (khi sắp xếp). */
  truong_score: number | null;
  nganh_id: number;
  ten_nganh: string;
  /** Các môn trong đề — đúng như lưu trong `dh_truong_nganh.mon_thi` (gợi ý + tùy chỉnh). */
  mon_thi: string[];
  details: string | null;
};

/**
 * Đọc toàn bộ cặp `dh_truong_nganh` có join được trường & ngành (đồng bộ admin).
 * `mon_thi` giữ mọi nhãn đã lưu (gợi ý + tùy chỉnh), không lọc chỉ danh sách cố định.
 */
export async function fetchDhExamProfilesSafe(
  supabase: SupabaseClient,
): Promise<DhExamProfileRow[]> {
  try {
    const { data, error } = await supabase
      .from("dh_truong_nganh")
      .select(
        `
        truong_dai_hoc,
        nganh_dao_tao,
        mon_thi,
        details,
        dh_truong_dai_hoc ( ten_truong_dai_hoc, score ),
        dh_nganh_dao_tao ( ten_nganh )
      `,
      );

    if (error || !data?.length) return [];

    const rows: DhExamProfileRow[] = [];
    for (const raw of data as Record<string, unknown>[]) {
      const tr = raw.dh_truong_dai_hoc as { ten_truong_dai_hoc?: string; score?: unknown } | null;
      const ng = raw.dh_nganh_dao_tao as { ten_nganh?: string } | null;
      const tid = Number(raw.truong_dai_hoc);
      const nid = Number(raw.nganh_dao_tao);
      if (!Number.isFinite(tid) || !Number.isFinite(nid)) continue;

      let truongScore: number | null = null;
      const sc = tr?.score;
      if (sc != null && sc !== "") {
        const n = typeof sc === "number" ? sc : Number(sc);
        if (Number.isFinite(n)) truongScore = n;
      }

      const monThi = parseMonThiArrayPermissive(raw.mon_thi);
      const details = typeof raw.details === "string" ? raw.details : null;

      rows.push({
        truong_id: tid,
        ten_truong_dai_hoc: String(tr?.ten_truong_dai_hoc ?? "").trim() || `Trường ${tid}`,
        truong_score: truongScore,
        nganh_id: nid,
        ten_nganh: String(ng?.ten_nganh ?? "").trim() || `Ngành ${nid}`,
        mon_thi: monThi,
        details: details?.trim() ? details.trim() : null,
      });
    }
    rows.sort((a, b) => {
      const sa = a.truong_score == null ? Number.POSITIVE_INFINITY : a.truong_score;
      const sb = b.truong_score == null ? Number.POSITIVE_INFINITY : b.truong_score;
      if (sa !== sb) return sa - sb;
      const tc = a.ten_truong_dai_hoc.localeCompare(b.ten_truong_dai_hoc, "vi");
      if (tc !== 0) return tc;
      return a.ten_nganh.localeCompare(b.ten_nganh, "vi");
    });
    return rows;
  } catch {
    return [];
  }
}

export function formatDhExamProfilesForPrompt(rows: DhExamProfileRow[]): string {
  if (!rows.length) return "";

  const chunks: string[] = [];
  for (const r of rows) {
    const lines: string[] = [];
    lines.push(
      `Trường: ${r.ten_truong_dai_hoc} (id_trường=${r.truong_id}) | Ngành: ${r.ten_nganh} (id_ngành=${r.nganh_id})`,
    );
    if (r.truong_score != null && Number.isFinite(r.truong_score)) {
      lines.push(`Score trường (dh_truong_dai_hoc.score — thấp hơn = ưu tiên cao hơn): ${r.truong_score}`);
    }
    if (r.mon_thi.length) {
      lines.push(`Môn thi / hình thức: ${r.mon_thi.join(", ")}`);
    } else {
      lines.push(
        `Môn thi / hình thức: (chưa khai báo trong admin — không suy đoán; nhờ kiểm tra hoặc hỏi HV đề chính thức)`,
      );
    }
    if (r.details?.trim()) {
      lines.push(`Chi tiết thêm: ${r.details.trim()}`);
    }
    chunks.push(lines.join("\n"));
  }

  return chunks.join("\n\n---\n\n");
}
