import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { countHocVienDangHoc } from "@/lib/data/admin-qlhv-tinh-trang";
import { fetchAdminQuanLyHocVienBundle } from "@/lib/data/admin-quan-ly-hoc-vien";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Tổng học viên đang học — tải sau phần marketing hiển thị (cùng bundle QLHV). */
export async function GET() {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập admin." }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY trên server." },
      { status: 503 },
    );
  }

  const hvBundle = await fetchAdminQuanLyHocVienBundle(supabase);
  if (hvBundle.error) {
    return NextResponse.json({ ok: false, error: hvBundle.error }, { status: 502 });
  }
  const count = countHocVienDangHoc(hvBundle.students, hvBundle.enrollments);
  return NextResponse.json({ ok: true, count });
}
