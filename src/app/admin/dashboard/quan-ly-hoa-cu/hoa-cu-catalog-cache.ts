"use client";

import { loadHoaCuSanPhamCatalogAction } from "@/app/admin/dashboard/quan-ly-hoa-cu/actions";
import type { AdminHoaCuSanPham } from "@/lib/data/admin-hoa-cu";

/** Cache danh mục theo chi nhánh — tránh gọi lại server action khi mở modal lần 2. */
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { data: AdminHoaCuSanPham[]; at: number };

const cache = new Map<number, CacheEntry>();
const inflight = new Map<
  number,
  Promise<{ ok: true; data: AdminHoaCuSanPham[] } | { ok: false; error: string }>
>();

export function getCachedHoaCuCatalog(branchId: number): AdminHoaCuSanPham[] | null {
  if (!Number.isFinite(branchId) || branchId <= 0) return null;
  const entry = cache.get(branchId);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(branchId);
    return null;
  }
  return entry.data;
}

function setCachedHoaCuCatalog(branchId: number, data: AdminHoaCuSanPham[]) {
  cache.set(branchId, { data, at: Date.now() });
}

/** Xóa cache sau nhập/bán/chuyển/sửa kho để lần mở sau lấy tồn mới. */
export function invalidateHoaCuCatalogCache(branchId?: number) {
  if (branchId != null && Number.isFinite(branchId) && branchId > 0) {
    cache.delete(branchId);
    inflight.delete(branchId);
    return;
  }
  cache.clear();
  inflight.clear();
}

export async function fetchHoaCuCatalogForBranch(
  branchId: number,
  opts?: { force?: boolean },
): Promise<{ ok: true; data: AdminHoaCuSanPham[] } | { ok: false; error: string }> {
  if (!Number.isFinite(branchId) || branchId <= 0) {
    return { ok: false, error: "Chi nhánh không hợp lệ." };
  }

  if (!opts?.force) {
    const cached = getCachedHoaCuCatalog(branchId);
    if (cached) return { ok: true, data: cached };
    const pending = inflight.get(branchId);
    if (pending) return pending;
  }

  const request = loadHoaCuSanPhamCatalogAction(branchId).then((r) => {
    inflight.delete(branchId);
    if (r.ok) setCachedHoaCuCatalog(branchId, r.data);
    return r;
  });

  inflight.set(branchId, request);
  return request;
}

/** Tải nền khi vào trang / đổi chi nhánh — modal mở sau thường đã có cache. */
export function prefetchHoaCuCatalog(branchId: number | null | undefined) {
  if (branchId == null || !Number.isFinite(branchId) || branchId <= 0) return;
  if (getCachedHoaCuCatalog(branchId)) return;
  void fetchHoaCuCatalogForBranch(branchId);
}
