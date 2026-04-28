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

const ALLOWED_MON = new Set<string>(DH_MON_THI_HOP_LE as unknown as string[]);

export type DhExamProfileRow = {
  truong_id: number;
  ten_truong_dai_hoc: string;
  nganh_id: number;
  ten_nganh: string;
  /** Các môn trong đề — chỉ các nhãn trong DH_MON_THI_HOP_LE được giữ khi đọc DB. */
  mon_thi: string[];
  details: string | null;
};

function parseMonThiArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!t) continue;
    if (ALLOWED_MON.has(t)) out.push(t);
  }
  return out;
}

/**
 * Đọc `dh_truong_nganh` (đã có cột mon_thi, details). Thiếu cột / lỗi → [].
 * Chỉ lấy dòng có ít nhất một môn hoặc có details.
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
        dh_truong_dai_hoc ( ten_truong_dai_hoc ),
        dh_nganh_dao_tao ( ten_nganh )
      `,
      );

    if (error || !data?.length) return [];

    const rows: DhExamProfileRow[] = [];
    for (const raw of data as Record<string, unknown>[]) {
      const tr = raw.dh_truong_dai_hoc as { ten_truong_dai_hoc?: string } | null;
      const ng = raw.dh_nganh_dao_tao as { ten_nganh?: string } | null;
      const tid = Number(raw.truong_dai_hoc);
      const nid = Number(raw.nganh_dao_tao);
      if (!Number.isFinite(tid) || !Number.isFinite(nid)) continue;

      const monThi = parseMonThiArray(raw.mon_thi);
      const details = typeof raw.details === "string" ? raw.details : null;
      if (monThi.length === 0 && !(details?.trim())) continue;

      rows.push({
        truong_id: tid,
        ten_truong_dai_hoc: String(tr?.ten_truong_dai_hoc ?? "").trim() || `Trường ${tid}`,
        nganh_id: nid,
        ten_nganh: String(ng?.ten_nganh ?? "").trim() || `Ngành ${nid}`,
        mon_thi: monThi,
        details: details?.trim() ? details.trim() : null,
      });
    }
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
    if (r.mon_thi.length) {
      lines.push(`Môn thi / hình thức: ${r.mon_thi.join(", ")}`);
    }
    if (r.details?.trim()) {
      lines.push(`Chi tiết thêm: ${r.details.trim()}`);
    }
    chunks.push(lines.join("\n"));
  }

  return chunks.join("\n\n---\n\n");
}
