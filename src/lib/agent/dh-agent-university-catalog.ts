import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE = 80;
/** Chỉ mốc lịch — không nhân đôi danh mục trường/ngành (đã có trong khối đề thi theo cặp). */
const MAX_MOC_LINES = 20;
/** Chỉ tiêu / điểm chuẩn theo năm (`dh_truong_nganh_theo_nam`) — giới hạn dòng trong prompt. */
const MAX_METRIC_LINES = 150;

function clampSnippet(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function nIdPos(v: unknown): number | null {
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNamInt(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseChiTieu(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseDiemChuan(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

export type DhAgentUniversityCatalogResult = {
  promptAppend: string;
  warnings: string[];
};

const IN_CHUNK = 200;

async function fetchMetricLinesForPrompt(
  supabase: SupabaseClient,
  warnings: string[],
  namTuyenSinhMin: number,
): Promise<string[]> {
  const lines: string[] = [];
  const trMap = new Map<number, string>();
  const ngMap = new Map<number, string>();
  let from = 0;
  let truncated = false;
  let errMsg: string | null = null;

  async function ensureTruongNames(ids: number[]) {
    const need = ids.filter((id) => !trMap.has(id));
    if (!need.length) return;
    for (let i = 0; i < need.length; i += IN_CHUNK) {
      const chunk = need.slice(i, i + IN_CHUNK);
      const { data, error } = await supabase
        .from("dh_truong_dai_hoc")
        .select("id, ten_truong_dai_hoc")
        .in("id", chunk);
      if (error) {
        warnings.push(`dh_truong_dai_hoc (metric lookup): ${error.message}`);
        return;
      }
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const id = nIdPos(row.id);
        if (id == null) continue;
        trMap.set(id, String(row.ten_truong_dai_hoc ?? "").trim() || `Trường #${id}`);
      }
    }
  }

  async function ensureNganhNames(ids: number[]) {
    const need = ids.filter((id) => !ngMap.has(id));
    if (!need.length) return;
    for (let i = 0; i < need.length; i += IN_CHUNK) {
      const chunk = need.slice(i, i + IN_CHUNK);
      const { data, error } = await supabase
        .from("dh_nganh_dao_tao")
        .select("id, ten_nganh")
        .in("id", chunk);
      if (error) {
        warnings.push(`dh_nganh_dao_tao (metric lookup): ${error.message}`);
        return;
      }
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const id = nIdPos(row.id);
        if (id == null) continue;
        ngMap.set(id, String(row.ten_nganh ?? "").trim() || `Ngành #${id}`);
      }
    }
  }

  for (;;) {
    if (lines.length >= MAX_METRIC_LINES) {
      truncated = true;
      break;
    }
    const { data, error } = await supabase
      .from("dh_truong_nganh_theo_nam")
      .select("nam_tuyen_sinh, chi_tieu, diem_chuan, ghi_chu, truong_dai_hoc, nganh_dao_tao")
      .gte("nam_tuyen_sinh", namTuyenSinhMin)
      .order("nam_tuyen_sinh", { ascending: false })
      .order("truong_dai_hoc", { ascending: true })
      .order("nganh_dao_tao", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      errMsg = error.message;
      break;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    if (!batch.length) break;

    const trIds: number[] = [];
    const ngIds: number[] = [];
    for (const raw of batch) {
      const tid = nIdPos(raw.truong_dai_hoc);
      const nid = nIdPos(raw.nganh_dao_tao);
      if (tid != null && !trMap.has(tid)) trIds.push(tid);
      if (nid != null && !ngMap.has(nid)) ngIds.push(nid);
    }
    await ensureTruongNames([...new Set(trIds)]);
    await ensureNganhNames([...new Set(ngIds)]);

    for (const raw of batch) {
      if (lines.length >= MAX_METRIC_LINES) {
        truncated = true;
        break;
      }
      const nam = parseNamInt(raw.nam_tuyen_sinh);
      if (nam == null) continue;

      const tid = nIdPos(raw.truong_dai_hoc);
      const nid = nIdPos(raw.nganh_dao_tao);
      const tenTr = tid != null ? trMap.get(tid) ?? `Trường #${tid}` : "Trường ?";
      const tenNg = nid != null ? ngMap.get(nid) ?? `Ngành #${nid}` : "Ngành ?";

      const chi = parseChiTieu(raw.chi_tieu);
      const dc = parseDiemChuan(raw.diem_chuan);
      const gcRaw = typeof raw.ghi_chu === "string" ? raw.ghi_chu.trim() : "";
      const gc = gcRaw ? clampSnippet(gcRaw, 72) : "";

      if (chi == null && dc == null && !gc) continue;

      const ct = chi != null ? String(chi) : "—";
      const dch = dc != null ? String(dc) : "—";
      const tail = gc ? ` — ${gc}` : "";
      lines.push(`- ${tenTr} — ${tenNg} — năm ${nam}: chỉ tiêu ${ct}; điểm chuẩn ${dch}${tail}`);
    }

    if (truncated) break;
    if (batch.length < PAGE) break;
    from += PAGE;
  }

  if (errMsg) warnings.push(`dh_truong_nganh_theo_nam: ${errMsg}`);
  if (truncated) {
    warnings.push(
      `Chỉ tiêu/điểm chuẩn: tối đa ${MAX_METRIC_LINES} dòng trong prompt — đầy đủ trên admin.`,
    );
  }

  return lines;
}

/**
 * **Mốc lịch** (`dh_moc_lich_tuyen_sinh`) + **chỉ tiêu / điểm chuẩn theo năm**
 * (`dh_truong_nganh_theo_nam`), rút gọn. Tên trường/ngành trong khối đề thi ĐH
 * (`dh_truong_nganh`) là catalog môn thi; khối này bổ sung số liệu tuyển theo năm.
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

  const yCatalog = new Date().getFullYear();
  /** ~3 năm gần nhất — giảm số dòng tổng để nhiều trường/ngành (vd. ĐH Mỹ thuật) còn chỗ trong prompt. */
  const metricNamMin = Math.max(2000, yCatalog - 2);
  const metricLines = await fetchMetricLinesForPrompt(supabase, warnings, metricNamMin);

  const blocks: string[] = [];

  if (mocLines.length > 0) {
    blocks.push(
      [
        "Mốc TS (rút gọn; đề thi xem khối ĐH phía trên). Full: admin.",
        "",
        `MỐC (${MAX_MOC_LINES} dòng max):\n${mocLines.join("\n")}`,
      ].join("\n"),
    );
  } else {
    const msg =
      mocErr ?
        "Không đọc được mốc lịch (lỗi DB)."
      : "Chưa có mốc lịch trong DB hoặc bảng trống.";
    blocks.push(`Mốc TS: không có trong prompt. (${msg})`);
  }

  if (metricLines.length > 0) {
    blocks.push(
      [
        `Chỉ tiêu / điểm chuẩn theo năm (rút gọn; dh_truong_nganh_theo_nam; các năm ≥ ${metricNamMin}). Full: admin.`,
        "",
        `SỐ LIỆU (${MAX_METRIC_LINES} dòng max):\n${metricLines.join("\n")}`,
      ].join("\n"),
    );
  } else {
    const hasErr = warnings.some((w) => w.startsWith("dh_truong_nganh_theo_nam:"));
    blocks.push(
      hasErr ?
        "Chỉ tiêu/điểm chuẩn: không đọc được (lỗi DB)."
      : "Chỉ tiêu/điểm chuẩn theo năm: chưa có dòng nào có chỉ tiêu, điểm chuẩn hoặc ghi chú trong prompt.",
    );
  }

  const warnTail = warnings.length ? `\n\nLưu ý: ${warnings.join(" | ")}` : "";
  const promptAppend = `${blocks.join("\n\n")}${warnTail}`;

  return { promptAppend, warnings };
}
