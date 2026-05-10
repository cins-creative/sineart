import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE = 80;
/** Chỉ mốc lịch — không nhân đôi danh mục trường/ngành (đã có trong khối đề thi theo cặp). */
const MAX_MOC_LINES = 20;

function clampSnippet(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export type DhAgentUniversityCatalogResult = {
  promptAppend: string;
  warnings: string[];
};

/**
 * Chỉ **mốc lịch tuyển sinh** (rút gọn). Tên trường/ngành đầy đủ đã nằm trong khối
 * «ĐỀ THI ĐẠI HỌC THEO TRƯỜNG VÀ NGÀNH» — không liệt kê lại bảng `dh_truong_dai_hoc` / `dh_nganh_dao_tao` trong prompt.
 */
export async function fetchDhAgentUniversityCatalogForPrompt(
  supabase: SupabaseClient,
): Promise<DhAgentUniversityCatalogResult> {
  const warnings: string[] = [];

  const mocLines: string[] = [];
  let from = 0;
  let mocTruncated = false;
  let mocErr: string | null = null;

  for (;;) {
    if (mocLines.length >= MAX_MOC_LINES) {
      mocTruncated = true;
      break;
    }
    const { data, error } = await supabase
      .from("dh_moc_lich_tuyen_sinh")
      .select(
        `
        nam_tuyen_sinh,
        ten_moc,
        thoi_gian_mo_ta,
        truong_dai_hoc,
        dh_truong_dai_hoc ( ten_truong_dai_hoc )
      `,
      )
      .order("truong_dai_hoc", { ascending: true })
      .order("nam_tuyen_sinh", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      mocErr = error.message;
      break;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;

    for (const raw of batch) {
      if (mocLines.length >= MAX_MOC_LINES) {
        mocTruncated = true;
        break;
      }
      const nam = Number(raw.nam_tuyen_sinh);
      if (!Number.isFinite(nam)) continue;

      const trNest = raw.dh_truong_dai_hoc;
      const trOne = Array.isArray(trNest) ? trNest[0] : trNest;
      const tr = trOne as { ten_truong_dai_hoc?: string } | null;
      const tid = Number(raw.truong_dai_hoc);
      const tenTr =
        String(tr?.ten_truong_dai_hoc ?? "").trim() ||
        (Number.isFinite(tid) && tid > 0 ? `Trường id ${tid}` : "Trường ?");

      const tenMoc =
        typeof raw.ten_moc === "string" && raw.ten_moc.trim()
          ? raw.ten_moc.trim()
          : null;
      const tg = clampSnippet(String(raw.thoi_gian_mo_ta ?? ""), 90);

      const parts = [
        tenTr,
        `năm ${Math.trunc(nam)}`,
        tenMoc ? tenMoc : null,
        tg ? tg : null,
      ].filter(Boolean);
      mocLines.push(`- ${parts.join(" — ")}`);
    }

    if (mocTruncated) break;
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  if (mocErr) warnings.push(`dh_moc_lich_tuyen_sinh: ${mocErr}`);
  if (mocTruncated) {
    warnings.push(
      `Mốc lịch: tối đa ${MAX_MOC_LINES} dòng trong prompt — chi tiết đầy đủ trên admin.`,
    );
  }

  if (mocLines.length === 0) {
    const msg =
      mocErr ?
        "Không đọc được mốc lịch (lỗi DB)."
      : "Chưa có mốc lịch trong DB hoặc bảng trống.";
    return {
      promptAppend: `Mốc TS: không có trong prompt. (${msg}) Đề thi: khối ĐH phía trên.`,
      warnings,
    };
  }

  const promptAppend = [
    "Mốc TS (rút gọn; đề thi xem khối ĐH phía trên). Full: admin.",
    "",
    `MỐC (${MAX_MOC_LINES} dòng max):\n${mocLines.join("\n")}`,
    warnings.length ? `\nLưu ý: ${warnings.join(" | ")}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");

  return { promptAppend, warnings };
}
