import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAdminGoiHocPhiBundle } from "@/lib/data/admin-goi-hoc-phi";

const MAX_LOP_LINES = 120;

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Math.round(Number(n)).toLocaleString("vi-VN")}đ`;
}

function truthyTinhTrang(v: unknown): boolean {
  return v !== false && v !== "false" && v !== 0 && v !== "0";
}

/** Dòng lớp cho tool `query_courses` / Messenger — khớp trường admin `ql_lop_hoc`. */
export type AgentAvailableClassRow = {
  id: number;
  /** Tiêu đề hiển thị — ưu tiên `class_full_name` */
  ten_lop: string;
  ten_mon_hoc: string | null;
  ten_chi_nhanh: string | null;
  lich_hoc: string | null;
  url_class: string | null;
  device: string | null;
  cap_toc: boolean;
  level_hinh_hoa: string | null;
};

export type AgentOperationalCatalogResult = {
  promptAppend: string;
  available_classes: AgentAvailableClassRow[];
  loadWarnings: string[];
};

/**
 * Dữ liệu vận hành đồng bộ trang admin: Chi nhánh (`ql_chi_nhanh`), Khóa/môn (`ql_mon_hoc`),
 * Lớp (`ql_lop_hoc`), Gói học phí (`hp_goi_hoc_phi*` qua `fetchAdminGoiHocPhiBundle`).
 */
export async function fetchAgentOperationalCatalog(
  supabase: SupabaseClient,
): Promise<AgentOperationalCatalogResult> {
  const warnings: string[] = [];

  let branchSelectErr = null as { message: string } | null;
  let branchData: unknown[] | null = null;
  {
    const full = await supabase
      .from("ql_chi_nhanh")
      .select("id, ten, dia_chi, sdt, is_active")
      .order("id", { ascending: true });
    if (full.error) {
      const msg = full.error.message?.toLowerCase() ?? "";
      if (msg.includes("column") || msg.includes("schema")) {
        const min = await supabase.from("ql_chi_nhanh").select("id, ten").order("id", { ascending: true });
        branchData = (min.data ?? []) as unknown[];
        branchSelectErr = min.error;
      } else {
        branchSelectErr = full.error;
      }
    } else {
      branchData = (full.data ?? []) as unknown[];
    }
  }

  const [monRes, lopRes, goiBundle] = await Promise.all([
    supabase
      .from("ql_mon_hoc")
      .select("id, ten_mon_hoc, loai_khoa_hoc, hinh_thuc")
      .order("thu_tu_hien_thi", { ascending: true }),
    supabase
      .from("ql_lop_hoc")
      .select(
        "id, class_name, class_full_name, mon_hoc, chi_nhanh_id, lich_hoc, url_class, device, special, tinh_trang, level_hinh_hoa",
      )
      .order("class_full_name", { ascending: true }),
    fetchAdminGoiHocPhiBundle(supabase),
  ]);

  if (branchSelectErr) {
    warnings.push(`Chi nhánh: ${branchSelectErr.message}`);
  }
  if (monRes.error) {
    warnings.push(`Khóa học (ql_mon_hoc): ${monRes.error.message}`);
  }
  if (lopRes.error) {
    warnings.push(`Lớp học (ql_lop_hoc): ${lopRes.error.message}`);
  }
  if (goiBundle.loadError) {
    warnings.push(`Gói học phí: ${goiBundle.loadError}`);
  }

  const branchRows = (branchData ?? []) as {
    id?: unknown;
    ten?: unknown;
    dia_chi?: unknown;
    sdt?: unknown;
    is_active?: unknown;
  }[];
  const branchesActive = branchRows.filter((b) => b.is_active === undefined || b.is_active === null || b.is_active === true);

  const monRows = (monRes.data ?? []) as {
    id?: unknown;
    ten_mon_hoc?: unknown;
    loai_khoa_hoc?: unknown;
    hinh_thuc?: unknown;
  }[];

  const monById = new Map<number, string>();
  for (const m of monRows) {
    const id = Number(m.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    monById.set(id, String(m.ten_mon_hoc ?? "").trim() || `Môn #${id}`);
  }

  const chiById = new Map<number, string>();
  for (const b of branchesActive) {
    const id = Number(b.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    chiById.set(id, String(b.ten ?? "").trim() || `Chi nhánh #${id}`);
  }

  const lopRowsAll = (lopRes.data ?? []) as {
    id?: unknown;
    class_name?: unknown;
    class_full_name?: unknown;
    mon_hoc?: unknown;
    chi_nhanh_id?: unknown;
    lich_hoc?: unknown;
    url_class?: unknown;
    device?: unknown;
    special?: unknown;
    tinh_trang?: unknown;
    level_hinh_hoa?: unknown;
  }[];

  const lopActive = lopRowsAll.filter((r) => truthyTinhTrang(r.tinh_trang));
  const lopForPrompt = lopActive.slice(0, MAX_LOP_LINES);
  const truncatedLop = lopActive.length > MAX_LOP_LINES;
  if (truncatedLop) {
    warnings.push(`Lớp (trong prompt): chỉ liệt kê ${MAX_LOP_LINES}/${lopActive.length} dòng; toàn bộ lớp hoạt động vẫn có trong JSON tool query_courses.`);
  }

  function rowToAvailableClass(r: (typeof lopActive)[0]): AgentAvailableClassRow | null {
    const id = Number(r.id);
    const mid = r.mon_hoc != null && Number.isFinite(Number(r.mon_hoc)) ? Number(r.mon_hoc) : null;
    const tenMon = mid != null ? monById.get(mid) ?? null : null;
    const cid =
      r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id)) ? Number(r.chi_nhanh_id) : null;
    const tenChi = cid != null ? chiById.get(cid) ?? null : null;
    const title =
      String(r.class_full_name ?? "").trim() ||
      String(r.class_name ?? "").trim() ||
      `Lớp #${id}`;
    const capToc = String(r.special ?? "").trim() === "Cấp tốc";
    const lh = r.lich_hoc != null ? String(r.lich_hoc).trim() : "";
    const slug = r.url_class != null ? String(r.url_class).trim() : "";
    const dev = r.device != null ? String(r.device).trim() : "";
    const lvl = r.level_hinh_hoa != null ? String(r.level_hinh_hoa).trim() : "";
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
      id,
      ten_lop: title,
      ten_mon_hoc: tenMon,
      ten_chi_nhanh: tenChi,
      lich_hoc: lh || null,
      url_class: slug || null,
      device: dev || null,
      cap_toc: capToc,
      level_hinh_hoa: lvl || null,
    };
  }

  const available_classes: AgentAvailableClassRow[] = lopActive
    .map(rowToAvailableClass)
    .filter((x): x is AgentAvailableClassRow => x != null);

  const branchesLines =
    branchesActive.length === 0
      ? "(Không đọc được chi nhánh hoặc danh sách trống.)"
      : branchesActive
          .map((b) => {
            const id = Number(b.id);
            const ten = String(b.ten ?? "").trim() || `—`;
            const dc = b.dia_chi != null && String(b.dia_chi).trim() ? String(b.dia_chi).trim() : "";
            const sdt = b.sdt != null && String(b.sdt).trim() ? String(b.sdt).trim() : "";
            const tail = [dc && `địa chỉ: ${dc}`, sdt && `SĐT: ${sdt}`].filter(Boolean).join(" | ");
            return `- id ${Number.isFinite(id) ? id : "?"} — ${ten}${tail ? ` — ${tail}` : ""}`;
          })
          .join("\n");

  const monLines =
    monRows.length === 0
      ? "(Không đọc được khóa học hoặc danh sách trống.)"
      : monRows
          .map((m) => {
            const id = Number(m.id);
            const ten = String(m.ten_mon_hoc ?? "").trim() || "—";
            const loai = m.loai_khoa_hoc != null ? String(m.loai_khoa_hoc).trim() : "";
            const ht = m.hinh_thuc != null ? String(m.hinh_thuc).trim() : "";
            const bits = [loai && `loại: ${loai}`, ht && `hình thức: ${ht}`].filter(Boolean).join(" | ");
            return `- môn id ${Number.isFinite(id) ? id : "?"} — ${ten}${bits ? ` — ${bits}` : ""}`;
          })
          .join("\n");

  const lopLines =
    lopForPrompt.length === 0
      ? "(Không có lớp đang hoạt động hoặc không đọc được dữ liệu.)"
      : lopForPrompt
          .map((r) => {
            const id = Number(r.id);
            const mid = r.mon_hoc != null && Number.isFinite(Number(r.mon_hoc)) ? Number(r.mon_hoc) : null;
            const tenMon = mid != null ? monById.get(mid) ?? null : null;
            const cid =
              r.chi_nhanh_id != null && Number.isFinite(Number(r.chi_nhanh_id))
                ? Number(r.chi_nhanh_id)
                : null;
            const tenChi = cid != null ? chiById.get(cid) ?? null : null;
            const title =
              String(r.class_full_name ?? "").trim() ||
              String(r.class_name ?? "").trim() ||
              `Lớp #${id}`;
            const capToc = String(r.special ?? "").trim() === "Cấp tốc";
            const lh = r.lich_hoc != null ? String(r.lich_hoc).trim() : "";
            const slug = r.url_class != null ? String(r.url_class).trim() : "";
            const dev = r.device != null ? String(r.device).trim() : "";
            const lvl = r.level_hinh_hoa != null ? String(r.level_hinh_hoa).trim() : "";

            const bits = [
              tenMon && `môn: ${tenMon}`,
              tenChi && `chi nhánh: ${tenChi}`,
              lh && `lịch: ${lh}`,
              dev && `thiết bị: ${dev}`,
              capToc ? "cấp tốc" : "",
              lvl && `level HH: ${lvl}`,
              slug && `slug khóa học (public): ${slug}`,
            ].filter(Boolean);
            return `- lớp id ${Number.isFinite(id) ? id : "?"} — ${title}${bits.length ? ` — ${bits.join(" — ")}` : ""}`;
          })
          .join("\n");

  const monLabel = (mid: number | null) =>
    mid != null && monById.has(mid) ? monById.get(mid)! : mid != null ? `môn id ${mid}` : "—";

  const goiLines =
    goiBundle.rows.length === 0
      ? "(Không đọc được gói học phí hoặc danh sách trống.)"
      : goiBundle.rows
          .map((g) => {
            const parts: string[] = [];
            parts.push(`gói id ${g.id}`);
            parts.push(`môn: ${monLabel(g.mon_hoc)}`);
            if (g.post_title) parts.push(`tên hiển thị: ${g.post_title}`);
            if (g.goiNumber != null) parts.push(`số gói: ${g.goiNumber}`);
            if (g.don_vi) parts.push(`đơn vị: ${g.don_vi}`);
            parts.push(`giá gốc: ${fmtMoney(g.gia_goc)}`);
            if (g.discount != null && Number(g.discount) > 0) {
              parts.push(`giảm: ${fmtMoney(g.discount)}`);
              if (g.gia_goc != null && Number.isFinite(Number(g.gia_goc)) && Number.isFinite(Number(g.discount))) {
                parts.push(`còn: ${fmtMoney(Number(g.gia_goc) - Number(g.discount))}`);
              }
            }
            if (g.so_buoi != null) parts.push(`số buổi: ${g.so_buoi}`);
            if (g.special) parts.push(`đặc biệt: ${g.special}`);
            if (g.note) parts.push(`ghi chú: ${g.note}`);
            return `- ${parts.join(" — ")}`;
          })
          .join("\n");

  const comboSection =
    goiBundle.comboOptions.length === 0
      ? ""
      : `\nCOMBO MÔN (hp_combo_mon — đang hoạt động):\n${goiBundle.comboOptions
          .filter((c) => c.dang_hoat_dong)
          .map(
            (c) =>
              `- combo id ${c.id} — ${c.ten_combo} — giảm combo ${fmtMoney(c.gia_giam)} — gồm gói id: ${c.goi_ids.join(", ")}`,
          )
          .join("\n")}`;

  const promptAppend = [
    "Trả lời học phí / khóa / lớp / chi nhánh chỉ dựa vào các khối dưới và Knowledge Base; không bịa giá hay lịch.",
    "",
    `CHI NHÁNH (ql_chi_nhanh):\n${branchesLines}`,
    "",
    `KHÓA HỌC / MÔN (ql_mon_hoc):\n${monLines}`,
    "",
    `LỚP ĐANG HOẠT ĐỘNG (ql_lop_hoc, tinh_trang đang bật)${truncatedLop ? " — đã cắt bớt nếu quá dài" : ""}:\n${lopLines}`,
    "",
    `GÓI HỌC PHÍ — bảng ${goiBundle.tableName} (đồng bộ trang admin Gói học phí):\n${goiLines}`,
    comboSection.trimEnd(),
    warnings.length ? `\nLưu ý tải dữ liệu: ${warnings.join(" | ")}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");

  return {
    promptAppend,
    available_classes,
    loadWarnings: warnings,
  };
}
