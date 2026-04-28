/**
 * Phân quyền sidebar dashboard theo `hr_phong.ten_phong` (qua `hr_nhan_su_phong`).
 * So khớp không phân biệt hoa thường + bỏ dấu tiếng Việt.
 */

import {
  DASHBOARD_OVERVIEW_HREF,
  HREFS_DIEU_HANH_ALL,
  HREFS_MARKETING_ALL,
  HREFS_NHAN_SU_TC_ALL,
  ORDER_MEDIA_HREF,
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
  | "ke_toan"
  | "nhan_su_phong"
  | "marketing_phong"
  | "media_phong"
  | "dao_tao_phong"
  | "unknown";

function classifyPhongTen(tenPhongRaw: string): PhongRule {
  const p = tonelessVi(tenPhongRaw);
  if (!p) return "unknown";
  if (p.includes("graphic")) return "graphic_design";
  if (p.includes("dao tao") || p.includes("daotao")) return "dao_tao_phong";
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
  return { allowedHrefs: union };
}

export function canAccessDashboardHref(allowedHrefs: Set<string> | null, href: string): boolean {
  if (allowedHrefs == null) return true;
  return allowedHrefs.has(href);
}
