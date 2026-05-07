/**
 * Phân quyền sidebar dashboard theo `hr_phong.ten_phong` (qua `hr_nhan_su_phong`).
 * So khớp không phân biệt hoa thường + bỏ dấu tiếng Việt.
 */

import {
  AGENT_CONSULT_HREF,
  DASHBOARD_OVERVIEW_HREF,
  HREFS_DIEU_HANH_ALL,
  HREFS_MARKETING_ALL,
  HREFS_NHAN_SU_TC_ALL,
  ORDER_MEDIA_HREF,
  STAFF_PERSONAL_DASHBOARD_HREF,
} from "@/lib/admin/dashboard-nav-config";

export type DashboardNavAccess = {
  /**
   * `null` = không giới hạn theo phòng (admin hoặc fallback).
   * Khác `null` = chỉ hiện link có `href` thuộc set (luôn gồm Tổng quan khi bị hạn).
   */
  allowedHrefs: Set<string> | null;
};

function tonelessVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

type PhongRule =
  | "graphic_design"
  | "tu_van"
  | "van_hanh"
  | "ke_toan"
  | "nhan_su_phong"
  | "marketing_phong"
  | "media_phong"
  | "dao_tao_phong"
  | "unknown";

/** Nhân sự thuộc phòng «Tư vấn» (theo `hr_phong.ten_phong`). */
export function staffBelongsToTuVanPhong(phongTenPhongs: readonly string[]): boolean {
  for (const t of phongTenPhongs) {
    if (classifyPhongTen(String(t)) === "tu_van") return true;
  }
  return false;
}

/** Ban «Vận Hành» — chỉnh `ql_thong_tin_hoc_vien.trang_thai_tu_van` (theo `hr_phong.ten_phong`). */
export function staffBelongsToVanHanhPhong(phongTenPhongs: readonly string[]): boolean {
  for (const t of phongTenPhongs) {
    if (classifyPhongTen(String(t)) === "van_hanh") return true;
  }
  return false;
}

/** Ban «Vận hành» / «Điều hành» — theo `hr_ban.ten_ban` (không dấu; có thể là «Ban Vận hành», …). */
export function staffBelongsToVanHanhBan(tenBans: readonly string[]): boolean {
  for (const raw of tenBans) {
    const p = tonelessVi(String(raw));
    if (!p) continue;
    if (p.includes("van hanh") || p.includes("vanhanh")) return true;
    if (p.includes("dieu hanh") || p.includes("dieuhanh")) return true;
  }
  return false;
}

function classifyPhongTen(tenPhongRaw: string): PhongRule {
  const p = tonelessVi(tenPhongRaw);
  if (!p) return "unknown";
  if (p.includes("graphic")) return "graphic_design";
  if (p.includes("dao tao") || p.includes("daotao")) return "dao_tao_phong";
  /** Ban Vận hành / Điều hành — cùng nhóm menu Điều hành + quyền sửa trạng thái tư vấn HV. */
  if (
    p.includes("van hanh") ||
    p.includes("vanhanh") ||
    p.includes("dieu hanh") ||
    p.includes("dieuhanh") ||
    p.includes("van-hanh") ||
    p.includes("dieu-hanh")
  ) {
    return "van_hanh";
  }
  if (p.includes("tu van") || p.includes("tuvan")) return "tu_van";
  if (p.includes("ke toan") || p.includes("ke-toan") || p.includes("ketoan")) return "ke_toan";
  if (p.includes("nhan su") || p.includes("nhan-su")) return "nhan_su_phong";
  if (p.includes("marketing")) return "marketing_phong";
  if (p.includes("media")) return "media_phong";
  return "unknown";
}

/** Href theo từng loại phòng (một phòng có thể góp nhiều route; nhiều phòng → hợp). */
function hrefsForPhongRule(rule: PhongRule): Set<string> {
  const s = new Set<string>();
  switch (rule) {
    case "tu_van":
    case "van_hanh":
      HREFS_DIEU_HANH_ALL.forEach((h) => s.add(h));
      break;
    case "marketing_phong":
      HREFS_MARKETING_ALL.forEach((h) => s.add(h));
      s.add("/admin/dashboard/quan-ly-hoa-cu");
      s.add("/admin/dashboard/thu-chi-khac");
      s.add(ORDER_MEDIA_HREF);
      break;
    case "ke_toan":
      s.add("/admin/dashboard/bao-cao-tai-chinh");
      s.add("/admin/dashboard/gia-tri-tai-san");
      s.add("/admin/dashboard/thong-ke-thu-chi");
      s.add("/admin/dashboard/sao-ke");
      break;
    case "nhan_su_phong":
      HREFS_DIEU_HANH_ALL.forEach((h) => s.add(h));
      HREFS_NHAN_SU_TC_ALL.forEach((h) => s.add(h));
      break;
    case "graphic_design":
      s.add("/admin/dashboard/quan-ly-media");
      s.add("/admin/dashboard/quan-ly-bai-hoc-vien");
      s.add(ORDER_MEDIA_HREF);
      break;
    case "media_phong":
      s.add("/admin/dashboard/quan-ly-media");
      s.add(ORDER_MEDIA_HREF);
      break;
    case "dao_tao_phong":
      break;
    default:
      break;
  }
  return s;
}

/**
 * @param staffRole `hr_nhan_su.vai_tro` — `admin` luôn full menu.
 * @param phongTenPhongs Danh sách `hr_phong.ten_phong` (distinct) của các phòng nhân sự thuộc.
 */
export function resolveDashboardNavAccess(
  staffRole: string | null,
  phongTenPhongs: readonly string[],
): DashboardNavAccess {
  if ((staffRole ?? "").trim().toLowerCase() === "admin") {
    return { allowedHrefs: null };
  }

  if (!phongTenPhongs.length) {
    return { allowedHrefs: null };
  }

  const rules = phongTenPhongs.map((t) => classifyPhongTen(String(t)));
  const onlyDaoTao = rules.length > 0 && rules.every((r) => r === "dao_tao_phong");

  if (onlyDaoTao) {
    if ((staffRole ?? "").trim().toLowerCase() === "tu_van") {
      return {
        allowedHrefs: new Set([DASHBOARD_OVERVIEW_HREF, ORDER_MEDIA_HREF, AGENT_CONSULT_HREF]),
      };
    }
    return { allowedHrefs: new Set([DASHBOARD_OVERVIEW_HREF, ORDER_MEDIA_HREF]) };
  }

  const union = new Set<string>();
  let anyRuleMatched = false;
  for (const r of rules) {
    if (r === "unknown" || r === "dao_tao_phong") continue;
    anyRuleMatched = true;
    for (const h of hrefsForPhongRule(r)) union.add(h);
  }

  if (!anyRuleMatched) {
    return { allowedHrefs: null };
  }

  union.add(DASHBOARD_OVERVIEW_HREF);
  union.add(ORDER_MEDIA_HREF);
  if ((staffRole ?? "").trim().toLowerCase() === "tu_van") {
    union.add(AGENT_CONSULT_HREF);
  }
  return { allowedHrefs: union };
}

export function canAccessDashboardHref(allowedHrefs: Set<string> | null, href: string): boolean {
  const pathOnly = href.split("?")[0] ?? href;
  if (
    pathOnly === STAFF_PERSONAL_DASHBOARD_HREF ||
    pathOnly.startsWith(`${STAFF_PERSONAL_DASHBOARD_HREF}/`)
  ) {
    return true;
  }
  if (allowedHrefs == null) return true;
  if (allowedHrefs.has(href)) return true;
  const path = href.split("?")[0] ?? href;
  for (const h of allowedHrefs) {
    if (path.length > h.length + 1 && path.startsWith(h + "/")) return true;
  }
  return false;
}
