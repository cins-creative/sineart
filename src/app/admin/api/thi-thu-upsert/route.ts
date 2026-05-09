import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import {
  THI_THU_KY_EDIT_FORBIDDEN_MSG,
  adminStaffCanEditThiThuKy,
} from "@/lib/admin/staff-mutation-access";
import { fetchAdminStaffShellProfile } from "@/lib/data/admin-shell-user";
import { normalizeDeThiForSave, parseDeThiJson } from "@/lib/thi-thu/de-thi-json";
import { parseThoiGianSuaBaiInputForPersist } from "@/lib/thi-thu/replay-time";
import { isMonThiKey } from "@/lib/thi-thu-config";
import { formatSupabaseWriteError } from "@/lib/supabase/postgres-permission-hint";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

type Body = {
  id?: unknown;
  tieu_de?: unknown;
  mon_thi?: unknown;
  thoi_gian_bat_dau?: unknown;
  thoi_gian_giai_lao_bat_dau?: unknown;
  thoi_gian_giai_lao_ket_thuc?: unknown;
  thumbnail_url?: unknown;
  lich_cham_bai_url?: unknown;
  video_sua_bai?: unknown;
  thoi_gian_sua_bai?: unknown;
  /** Mảng đề thi (JSON) — lưu vào `thi_thu_ky_thi.de_thi`. */
  de_thi?: unknown;
  trang_thai?: unknown;
};

function parseTs(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const supabaseGate = createServiceRoleClient();
  if (!supabaseGate) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }
  const profileGate = await fetchAdminStaffShellProfile(supabaseGate, session.staffId);
  if (!adminStaffCanEditThiThuKy(profileGate.vai_tro)) {
    return NextResponse.json({ ok: false, error: THI_THU_KY_EDIT_FORBIDDEN_MSG }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const tieuDe = typeof body.tieu_de === "string" ? body.tieu_de.trim() : "";
  const monThi = typeof body.mon_thi === "string" ? body.mon_thi.trim() : "";
  if (!tieuDe || !isMonThiKey(monThi)) {
    return NextResponse.json({ ok: false, error: "Thiếu tiêu đề hoặc môn thi không hợp lệ." }, {
      status: 400,
    });
  }

  const t0 =
    typeof body.thoi_gian_bat_dau === "string" && body.thoi_gian_bat_dau
      ? new Date(body.thoi_gian_bat_dau).toISOString()
      : null;
  if (!t0) {
    return NextResponse.json({ ok: false, error: "Thiếu giờ bắt đầu hợp lệ." }, { status: 400 });
  }

  const trangThai =
    body.trang_thai === "published" || body.trang_thai === "draft" ? body.trang_thai : "draft";

  const glStart = parseTs(body.thoi_gian_giai_lao_bat_dau);
  const glEnd = parseTs(body.thoi_gian_giai_lao_ket_thuc);
  if (monThi !== "hinh_hoa" && (glStart != null || glEnd != null)) {
    return NextResponse.json(
      { ok: false, error: "Giải lao chỉ áp dụng cho môn Hình họa." },
      { status: 400 },
    );
  }

  const supabase = supabaseGate;

  const thoiGianSuaBai = parseThoiGianSuaBaiInputForPersist(body.thoi_gian_sua_bai);
  if (thoiGianSuaBai != null && t0 != null) {
    const msStart = new Date(t0).getTime();
    const msSua = new Date(thoiGianSuaBai).getTime();
    if (Number.isFinite(msStart) && Number.isFinite(msSua) && msStart === msSua) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Thời gian phát video sửa bài phải khác giờ bắt đầu thi — đây là hai phiên (session) riêng.",
        },
        { status: 400 },
      );
    }
  }
  const videoSuaBai =
    typeof body.video_sua_bai === "string" && body.video_sua_bai.trim()
      ? body.video_sua_bai.trim()
      : null;

  const deThiPacked = normalizeDeThiForSave(parseDeThiJson(body.de_thi ?? []));

  const row = {
    tieu_de: tieuDe,
    mon_thi: monThi,
    thoi_gian_bat_dau: t0,
    thoi_gian_giai_lao_bat_dau: monThi === "hinh_hoa" ? glStart : null,
    thoi_gian_giai_lao_ket_thuc: monThi === "hinh_hoa" ? glEnd : null,
    thumbnail_url:
      typeof body.thumbnail_url === "string" && body.thumbnail_url.trim()
        ? body.thumbnail_url.trim()
        : null,
    lich_cham_bai_url:
      typeof body.lich_cham_bai_url === "string" && body.lich_cham_bai_url.trim()
        ? body.lich_cham_bai_url.trim()
        : null,
    video_sua_bai: videoSuaBai,
    thoi_gian_sua_bai: thoiGianSuaBai,
    de_thi: deThiPacked,
    trang_thai: trangThai,
  };

  const id = typeof body.id === "string" && body.id.length > 0 ? body.id.trim() : null;
  if (id) {
    const { data, error } = await supabase
      .from("thi_thu_ky_thi")
      .update(row)
      .eq("id", id)
      .select("id")
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: formatSupabaseWriteError(error, "thi_thu_ky_thi") },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, id: data?.id });
  }

  const { data, error } = await supabase
    .from("thi_thu_ky_thi")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, error: formatSupabaseWriteError(error, "thi_thu_ky_thi") },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, id: data?.id });
}
