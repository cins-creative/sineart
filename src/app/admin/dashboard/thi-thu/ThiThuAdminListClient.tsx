"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { formatThoiGianSuaBaiLabel } from "@/lib/thi-thu/replay-time";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuKyThiRow, ThiThuTrangThai } from "@/types/thi-thu";

function badgeClass(mon: MonThiKey): string {
  if (mon === "hinh_hoa") return "tti-adm-badge-hh";
  if (mon === "trang_tri_mau") return "tti-adm-badge-tt";
  return "tti-adm-badge-bc";
}

export default function ThiThuAdminListClient({
  rows,
  counts,
}: {
  rows: ThiThuKyThiRow[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const { canDelete, canEditThiThuKy } = useAdminDashboardAbilities();
  const [monFilter, setMonFilter] = useState<"" | MonThiKey>("");
  const [stFilter, setStFilter] = useState<"" | ThiThuTrangThai>("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const onDeleteKy = useCallback(
    async (id: string, title: string) => {
      const ok = window.confirm(
        `Xóa kỳ thi «${title}»? Toàn bộ đề thi và bài nộp của kỳ này sẽ bị xóa. Không hoàn tác.`,
      );
      if (!ok) return;
      setDeleteBusyId(id);
      try {
        const res = await fetch("/admin/api/thi-thu-ky-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const j = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !j.ok) throw new Error(j.error ?? "Không xóa được.");
        router.refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : "Lỗi khi xóa.");
      } finally {
        setDeleteBusyId(null);
      }
    },
    [router],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (monFilter && r.mon_thi !== monFilter) return false;
      if (stFilter && r.trang_thai !== stFilter) return false;
      return true;
    });
  }, [rows, monFilter, stFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const inMonth = rows.filter((r) => {
      const d = new Date(r.thoi_gian_bat_dau);
      return d.getFullYear() === y && d.getMonth() === m;
    }).length;
    const totalNop = Object.values(counts).reduce((a, b) => a + b, 0);
    const published = rows.filter((r) => r.trang_thai === "published").length;
    return { inMonth, totalNop, published };
  }, [rows, counts]);

  return (
    <div className="sa-thi-thu-admin mx-auto max-w-6xl px-4 py-8">
      <div className="tti-adm-stat-row">
        <div className="tti-adm-stat">
          <div className="tti-adm-stat-n">{stats.inMonth}</div>
          <div className="tti-adm-stat-l">Kỳ thi trong tháng</div>
        </div>
        <div className="tti-adm-stat">
          <div className="tti-adm-stat-n">{stats.totalNop}</div>
          <div className="tti-adm-stat-l">Tổng bài nộp</div>
        </div>
        <div className="tti-adm-stat">
          <div className="tti-adm-stat-n">{stats.published}</div>
          <div className="tti-adm-stat-l">Đang published</div>
        </div>
      </div>

      <div className="tti-adm-ph">
        <div className="tti-adm-ph-meta">
          <p>Marketing</p>
          <h1>Thi thử</h1>
        </div>
        {canEditThiThuKy ? (
          <Link href="/admin/dashboard/thi-thu/new" className="tti-adm-cta">
            + Tạo kỳ thi mới
          </Link>
        ) : null}
      </div>

      <div className="tti-adm-filt">
        <select
          className="tti-adm-sel"
          value={monFilter}
          onChange={(e) => setMonFilter(e.target.value as "" | MonThiKey)}
        >
          <option value="">Tất cả môn</option>
          <option value="hinh_hoa">Hình họa</option>
          <option value="trang_tri_mau">Trang trí màu</option>
          <option value="bo_cuc_mau">Bố cục màu</option>
        </select>
        <select
          className="tti-adm-sel"
          value={stFilter}
          onChange={(e) => setStFilter(e.target.value as "" | ThiThuTrangThai)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="draft">draft</option>
          <option value="published">published</option>
        </select>
      </div>

      <div className="tti-adm-tbl-shell">
        <div className="tti-adm-tbl-cap">
          <span className="tti-adm-tbl-cap-k">Danh sách kỳ thi</span>
          <span className="tti-adm-tbl-cap-n">{filtered.length}</span>
        </div>
        <div className="tti-adm-tbl-scroll">
          <table className="tti-adm-tbl">
            <thead>
              <tr>
                <th className="tti-adm-col-thumb">Ảnh</th>
                <th className="tti-adm-col-title">Tiêu đề</th>
                <th className="tti-adm-col-mon">Môn</th>
                <th className="tti-adm-col-time">Giờ bắt đầu</th>
                <th className="tti-adm-col-sua">Thời gian sửa bài</th>
                <th className="tti-adm-col-yt">Link Youtube sửa bài</th>
                <th className="tti-adm-col-st">Trạng thái</th>
                <th className="tti-adm-col-nop">Bài nộp</th>
                <th className="tti-adm-col-act">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const mon = r.mon_thi as MonThiKey;
                const cfg = getMonConfig(mon);
                const nop = counts[r.id] ?? 0;
                const suaLabel = formatThoiGianSuaBaiLabel(r.thoi_gian_bat_dau, r.thoi_gian_sua_bai);
                const yt = r.video_sua_bai?.trim() ?? "";
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="tti-adm-tbl-th overflow-hidden">
                        {r.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Link href={`/admin/dashboard/thi-thu/${r.id}`} className="tti-adm-tbl-link">
                        {r.tieu_de}
                      </Link>
                    </td>
                    <td>
                      <span className={badgeClass(mon)}>{cfg.label}</span>
                    </td>
                    <td className="tti-adm-cell-muted">{new Date(r.thoi_gian_bat_dau).toLocaleString("vi-VN")}</td>
                    <td className="tti-adm-cell-muted tti-adm-cell-sua">{suaLabel ?? "—"}</td>
                    <td className="tti-adm-cell-yt">
                      {yt ? (
                        <a href={yt} target="_blank" rel="noopener noreferrer" className="tti-adm-yt-link">
                          {yt.length > 36 ? `${yt.slice(0, 34)}…` : yt}
                        </a>
                      ) : (
                        <span className="tti-adm-dash">—</span>
                      )}
                    </td>
                    <td>
                      <span className={r.trang_thai === "published" ? "tti-sp tti-sp-p" : "tti-sp tti-sp-d"}>
                        {r.trang_thai}
                      </span>
                    </td>
                    <td className="tti-adm-cell-nop">
                      <span className="tti-adm-nop-pill">{nop}</span>
                    </td>
                    <td className="tti-adm-cell-act">
                      <div className="tti-adm-act-row">
                        {canEditThiThuKy ? (
                          <Link href={`/admin/dashboard/thi-thu/${r.id}`} className="tti-adm-act-edit">
                            Sửa
                          </Link>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="tti-adm-act-del"
                            disabled={deleteBusyId === r.id}
                            onClick={() => void onDeleteKy(r.id, r.tieu_de)}
                          >
                            {deleteBusyId === r.id ? "…" : "Xóa"}
                          </button>
                        ) : null}
                        {!canEditThiThuKy && !canDelete ? (
                          <span className="tti-adm-dash" title="Không có quyền thao tác">
                            —
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
