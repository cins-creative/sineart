"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import QuanLyHocVienView from "@/app/admin/dashboard/quan-ly-hoc-vien/QuanLyHocVienView";
import { fetchQuanLyHocVienBundleAction } from "@/app/admin/dashboard/quan-ly-hoc-vien/actions";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";
import {
  QUAN_LY_HOC_VIEN_CACHE_MAX_STUDENTS,
  readQuanLyHocVienCache,
  writeQuanLyHocVienCacheFromFullBundle,
  type QuanLyHocVienViewBundle,
} from "@/lib/admin/quan-ly-hoc-vien-local-cache";
import type { AdminQlhvLopBrief } from "@/lib/data/admin-quan-ly-hoc-vien";
import type { DhpDhCatalog } from "@/lib/donghocphi/dh-catalog";

type Props = {
  /** Đổi mỗi lần Server Component render lại (kể cả `router.refresh()`) — trigger refetch bundle. */
  reloadSignal: number;
  dhCatalog: DhpDhCatalog | null;
  adminStaffId: number;
  dhpShowExtraVndDiscount: boolean;
};

function lopOptionsFromLopById(lopById: Record<string, AdminQlhvLopBrief>) {
  return Object.values(lopById)
    .map((l) => ({
      id: l.id,
      name: l.class_name || l.class_full_name || `Lớp #${l.id}`,
      mon_hoc: l.mon_hoc,
      special: l.special,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export default function QuanLyHocVienBootstrap({
  reloadSignal,
  dhCatalog,
  adminStaffId,
  dhpShowExtraVndDiscount,
}: Props) {
  const [bundle, setBundle] = useState<QuanLyHocVienViewBundle | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect --
    Hydrate localStorage sau mount (tránh mismatch SSR). Refetch bundle khi `reloadSignal` đổi (`router.refresh()`). */
  useLayoutEffect(() => {
    const cached = readQuanLyHocVienCache();
    if (cached) {
      setBundle(cached);
      setSyncing(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSyncing(true);
    (async () => {
      const res = await fetchQuanLyHocVienBundleAction();
      if (cancelled) return;
      if (!res.ok) {
        setRemoteError(res.error);
        setSyncing(false);
        return;
      }
      setRemoteError(null);
      setBundle(res.bundle);
      writeQuanLyHocVienCacheFromFullBundle(res.bundle);
      setSyncing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const lopOptions = useMemo(
    () => (bundle ? lopOptionsFromLopById(bundle.lopById) : []),
    [bundle]
  );

  if (!bundle && !remoteError) {
    return <AdminDashboardTableSkeleton />;
  }

  if (!bundle && remoteError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Không tải được dữ liệu: {remoteError}
      </div>
    );
  }

  if (!bundle) {
    return <AdminDashboardTableSkeleton />;
  }

  return (
    <div className="space-y-3">
      {syncing && (
        <div
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
          role="status"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-slate-500" aria-hidden />
          <span>Đang đồng bộ danh sách mới nhất từ máy chủ…</span>
        </div>
      )}
      {remoteError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Không tải được bản mới: {remoteError}. Đang hiển thị dữ liệu đã lưu trên trình duyệt (tối đa{" "}
          {QUAN_LY_HOC_VIEN_CACHE_MAX_STUDENTS} học viên gần nhất trong cache).
        </div>
      )}
      <QuanLyHocVienView
        students={bundle.students}
        enrollments={bundle.enrollments}
        lopOptions={lopOptions}
        baiTapById={bundle.baiTapById}
        truongNganhByHvId={bundle.truongNganhByHvId}
        dhCatalog={dhCatalog}
        adminStaffId={adminStaffId}
        dhpShowExtraVndDiscount={dhpShowExtraVndDiscount}
      />
    </div>
  );
}
