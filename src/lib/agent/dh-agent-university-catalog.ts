import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE = 250;
/** Giới hạn dòng mốc lịch trong prompt — tránh vượt context model. */
const MAX_MOC_LINES = 450;

function sortKeyScore(v: number | null): number {
  return v == null || !Number.isFinite(v) ? Number.POSITIVE_INFINITY : v;
}

function clampSnippet(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export type DhAgentUniversityCatalogResult = {
  promptAppend: string;
  warnings: string[];
};

/**
 * Danh mục trường / ngành (bảng tham chiếu) + mốc lịch tuyển sinh — cùng nguồn admin
 * "Trường & ngành thi ĐH" (`dh_truong_dai_hoc`, `dh_nganh_dao_tao`, `dh_moc_lich_tuyen_sinh`).
 */
export async function fetchDhAgentUniversityCatalogForPrompt(
  supabase: SupabaseClient,
): Promise<DhAgentUniversityCatalogResult> {
  const warnings: string[] = [];

  const [truongRes, nganhRes] = await Promise.all([
    supabase.from("dh_truong_dai_hoc").select("id, ten_truong_dai_hoc, score"),
    supabase.from("dh_nganh_dao_tao").select("id, ten_nganh"),
  ]);

  if (truongRes.error) warnings.push(`dh_truong_dai_hoc: ${truongRes.error.message}`);
  if (nganhRes.error) warnings.push(`dh_nganh_dao_tao: ${nganhRes.error.message}`);

  type TruongRow = { id: number; ten: string; score: number | null };
  const truongRows: TruongRow[] = [];
  for (const r of truongRes.data ?? []) {
    const row = r as { id?: unknown; ten_truong_dai_hoc?: unknown; score?: unknown };
    const id = Number(row.id);
    const ten = String(row.ten_truong_dai_hoc ?? "").trim();
    if (!Number.isFinite(id) || id <= 0 || !ten) continue;
    let score: number | null = null;
    if (row.score != null && row.score !== "") {
      const n = typeof row.score === "number" ? row.score : Number(row.score);
      if (Number.isFinite(n)) score = n;
    }
    truongRows.push({ id, ten, score });
  }
  truongRows.sort((a, b) => {
    const sa = sortKeyScore(a.score);
    const sb = sortKeyScore(b.score);
    if (sa !== sb) return sa - sb;
    return a.ten.localeCompare(b.ten, "vi");
  });

  type NganhRow = { id: number; ten: string };
  const nganhRows: NganhRow[] = [];
  for (const r of nganhRes.data ?? []) {
    const row = r as { id?: unknown; ten_nganh?: unknown };
    const id = Number(row.id);
    const ten = String(row.ten_nganh ?? "").trim();
    if (!Number.isFinite(id) || id <= 0 || !ten) continue;
    nganhRows.push({ id, ten });
  }
  nganhRows.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));

  const truongById = new Map<number, string>();
  for (const t of truongRows) truongById.set(t.id, t.ten);

  const truongBlock =
    truongRows.length === 0
      ? "(Không đọc được danh sách trường hoặc bảng trống.)"
      : truongRows
          .map((t) => {
            const sc =
              t.score != null && Number.isFinite(t.score) ? ` — score: ${t.score}` : "";
            return `- id ${t.id} — ${t.ten}${sc}`;
          })
          .join("\n");

  const nganhBlock =
    nganhRows.length === 0
      ? "(Không đọc được danh sách ngành hoặc bảng trống.)"
      : nganhRows.map((n) => `- id ${n.id} — ${n.ten}`).join("\n");

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
        "id, truong_dai_hoc, nam_tuyen_sinh, ten_moc, thoi_gian_mo_ta, ghi_chu, nguon_thong_bao",
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
      const tid = Number(raw.truong_dai_hoc);
      const nam = Number(raw.nam_tuyen_sinh);
      if (!Number.isFinite(tid) || tid <= 0 || !Number.isFinite(nam)) continue;
      const tenTr = truongById.get(tid) ?? `Trường id ${tid}`;
      const tenMoc =
        typeof raw.ten_moc === "string" && raw.ten_moc.trim()
          ? raw.ten_moc.trim()
          : null;
      const tg = clampSnippet(String(raw.thoi_gian_mo_ta ?? ""), 360);
      const gc =
        typeof raw.ghi_chu === "string" && raw.ghi_chu.trim()
          ? clampSnippet(raw.ghi_chu, 200)
          : null;
      const nt =
        typeof raw.nguon_thong_bao === "string" && raw.nguon_thong_bao.trim()
          ? clampSnippet(raw.nguon_thong_bao, 200)
          : null;
      const parts = [
        `${tenTr} (id_trường=${tid})`,
        `năm ${Math.trunc(nam)}`,
        tenMoc ? `mốc: ${tenMoc}` : null,
        tg ? `thời gian / mô tả: ${tg}` : null,
        gc ? `ghi chú: ${gc}` : null,
        nt ? `nguồn TB: ${nt}` : null,
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
      `Mốc lịch tuyển sinh: chỉ liệt kê tối đa ${MAX_MOC_LINES} dòng trong prompt; toàn bộ vẫn nằm trong admin.`,
    );
  }

  const mocBlock =
    mocLines.length === 0
      ? mocErr
        ? "(Không đọc được mốc lịch tuyển sinh.)"
        : "(Chưa có mốc lịch trong hệ thống hoặc bảng trống.)"
      : mocLines.join("\n");

  const promptAppend = [
    "Tra cứu tên trường / ngành: dùng hai khối TRƯỜNG và NGÀNH bên dưới để khớp id và tên đầy đủ.",
    "Mốc lịch tuyển sinh: chỉ nêu theo dòng đã inject; không bịa ngày. Nếu thiếu mốc — kiểm tra admin hoặc hỏi lại.",
    "",
    `TRƯỜNG ĐẠI HỌC (dh_truong_dai_hoc):\n${truongBlock}`,
    "",
    `NGÀNH ĐÀO TẠO (dh_nganh_dao_tao):\n${nganhBlock}`,
    "",
    `MỐC LỊCH TUYỂN SINH (dh_moc_lich_tuyen_sinh)${mocTruncated ? " — đã giới hạn số dòng" : ""}:\n${mocBlock}`,
    warnings.length ? `\nLưu ý tải dữ liệu ĐH mở rộng: ${warnings.join(" | ")}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");

  return { promptAppend, warnings };
}
