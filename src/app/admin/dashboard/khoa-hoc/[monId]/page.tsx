import Link from "next/link";
import { redirect } from "next/navigation";

import EditMonView from "@/app/admin/dashboard/khoa-hoc/[monId]/EditMonView";
import type { EditMonRow } from "@/app/admin/dashboard/khoa-hoc/[monId]/EditMonView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ monId: string }> };

export default async function AdminKhoaHocEditPage({ params }: Props) {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const { monId: raw } = await params;
  const id = Number(String(raw ?? "").trim());
  if (!Number.isFinite(id) || id <= 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Mã môn không hợp lệ.{" "}
        <Link href="/admin/dashboard/khoa-hoc" className="font-semibold underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>.
      </div>
    );
  }

  const { data, error } = await supabase
    .from("ql_mon_hoc")
    .select(
      "id, ten_mon_hoc, thumbnail, loai_khoa_hoc, thu_tu_hien_thi, is_featured, hinh_thuc, si_so"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error ? error.message : "Không tìm thấy khóa học."}{" "}
        <Link href="/admin/dashboard/khoa-hoc" className="font-semibold underline">
          Danh sách
        </Link>
      </div>
    );
  }

  const r = data as {
    id?: unknown;
    ten_mon_hoc?: unknown;
    thumbnail?: unknown;
    loai_khoa_hoc?: unknown;
    thu_tu_hien_thi?: unknown;
    is_featured?: unknown;
    hinh_thuc?: unknown;
    si_so?: unknown;
  };

  const siRaw = r.si_so;
  const siNum = typeof siRaw === "number" ? siRaw : Number(siRaw);

  const row: EditMonRow = {
    id: Number(r.id),
    ten_mon_hoc: String(r.ten_mon_hoc ?? "").trim(),
    thumbnail: r.thumbnail != null ? String(r.thumbnail).trim() || null : null,
    loai_khoa_hoc: r.loai_khoa_hoc != null ? String(r.loai_khoa_hoc).trim() || null : null,
    thu_tu_hien_thi: Number.isFinite(Number(r.thu_tu_hien_thi)) ? Number(r.thu_tu_hien_thi) : 99,
    is_featured: Boolean(r.is_featured),
    hinh_thuc: r.hinh_thuc != null ? String(r.hinh_thuc).trim() || null : null,
    si_so: siRaw != null && Number.isFinite(siNum) ? siNum : null,
  };

  if (!row.ten_mon_hoc) {
    redirect("/admin/dashboard/khoa-hoc");
  }

  return <EditMonView row={row} />;
}
