"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import QuanLyNhanSuView from "@/app/admin/dashboard/quan-ly-nhan-su/QuanLyNhanSuView";
import { fetchQuanLyNhanSuBundleAction } from "@/app/admin/dashboard/quan-ly-nhan-su/actions";
import { AdminDashboardTableSkeleton } from "@/components/skeletons";
import {
  QUAN_LY_NHAN_SU_CACHE_MAX_STAFF,
  readQuanLyNhanSuCache,
  writeQuanLyNhanSuCacheFromFullBundle,
  type QuanLyNhanSuViewBundle,
} from "@/lib/admin/quan-ly-nhan-su-local-cache";

type Props = {
  reloadSignal: number;
};

export default function QuanLyNhanSuBootstrap({ reloadSignal }: Props) {
  const [bundle, setBundle] = useState<QuanLyNhanSuViewBundle | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect --
    Hydrate localStorage sau mount. Refetch khi `reloadSignal` đổi (`router.refresh()`). */
  useLayoutEffect(() => {
    const cached = readQuanLyNhanSuCache();
    if (cached) {
      setBundle(cached);
      setSyncing(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSyncing(true);
    (async () => {
      const res = await fetchQuanLyNhanSuBundleAction();
      if (cancelled) return;
      if (!res.ok) {
        setRemoteError(res.error);
        setSyncing(false);
        return;
      }
      setRemoteError(null);
      setBundle(res.bundle);
      writeQuanLyNhanSuCacheFromFullBundle(res.bundle);
      setSyncing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadSignal]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
      {syncing && (
        <div
          className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700"
          role="status"
        >
          <Loader2 className="size-4 shrink-0 animate-spin text-slate-500" aria-hidden />
          <span>Đang đồng bộ danh sách mới nhất từ máy chủ…</span>
        </div>
      )}
      {remoteError && (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Không tải được bản mới: {remoteError}. Đang hiển thị dữ liệu đã lưu trên trình duyệt (tối đa{" "}
          {QUAN_LY_NHAN_SU_CACHE_MAX_STAFF} nhân sự trong cache).
        </div>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <QuanLyNhanSuView
          staff={bundle.staff}
          chiNhanhById={bundle.chiNhanhById}
          banById={bundle.banById}
          phongBanByStaffId={bundle.phongBanByStaffId}
          phongIdsByStaffId={bundle.phongIdsByStaffId}
          allPhongOptions={bundle.allPhongOptions}
          phongToBanId={bundle.phongToBanId}
          banIdsByStaffId={bundle.banIdsByStaffId}
          bangTinhLuongByStaffId={bundle.bangTinhLuongByStaffId}
          lopGiangByTeacherId={bundle.lopGiangByTeacherId}
          usedMinimalSelect={bundle.usedMinimalSelect}
        />
      </div>
    </div>
  );
}
