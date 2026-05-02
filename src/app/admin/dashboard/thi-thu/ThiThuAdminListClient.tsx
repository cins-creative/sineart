"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { formatThoiGianSuaBaiLabel } from "@/lib/thi-thu/replay-time";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuBaiNopRow, ThiThuKyThiRow, ThiThuTrangThai } from "@/types/thi-thu";

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
  const [nopModalKyId, setNopModalKyId] = useState<string | null>(null);
  const [nopModalTitle, setNopModalTitle] = useState("");
  const [nopModalRows, setNopModalRows] = useState<ThiThuBaiNopRow[]>([]);
  const [nopModalLoading, setNopModalLoading] = useState(false);
  const [nopModalErr, setNopModalErr] = useState<string | null>(null);

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

  const closeNopModal = useCallback(() => {
    setNopModalKyId(null);
    setNopModalErr(null);
    setNopModalRows([]);
  }, []);

  const openNopModal = useCallback(async (kyId: string, tieuDe: string) => {
    setNopModalKyId(kyId);
    setNopModalTitle(tieuDe);
    setNopModalLoading(true);
    setNopModalErr(null);
    setNopModalRows([]);
    try {
      const res = await fetch(
        `/admin/api/thi-thu-bai-nop-list?ky_thi_id=${encodeURIComponent(kyId)}`,
        { credentials: "same-origin" },
      );
      const j = (await res.json()) as { ok?: boolean; rows?: ThiThuBaiNopRow[]; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Không tải được danh sách.");
      setNopModalRows(j.rows ?? []);
    } catch (e) {
      setNopModalErr(e instanceof Error ? e.message : "Lỗi tải.");
    } finally {
      setNopModalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!nopModalKyId) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeNopModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nopModalKyId, closeNopModal]);

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
                      <button
                        type="button"
                        className="tti-adm-nop-pill"
                        title="Xem danh sách bài nộp"
                        onClick={() => void openNopModal(r.id, r.tieu_de)}
                      >
                        {nop}
                      </button>
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

      {nopModalKyId ? (
        <div
          className="tti-modal-overlay"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeNopModal();
          }}
        >
          <div
            className="tti-modal-card tti-modal-card--nop-list"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tti-nop-list-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="tti-modal-nop-hd">
              <h2 id="tti-nop-list-title" className="tti-modal-nop-title">
                Bài nộp — {nopModalTitle}
              </h2>
              <p className="tti-modal-nop-sub">
                {nopModalLoading
                  ? "Đang tải…"
                  : nopModalErr
                    ? "—"
                    : `${nopModalRows.length} bài trong kỳ này`}
              </p>
            </div>
            <div className="tti-modal-nop-body">
              {nopModalErr ? <p className="tti-modal-nop-err">{nopModalErr}</p> : null}
              {!nopModalErr && nopModalLoading ? (
                <p className="tti-adm-dash">Đang tải danh sách…</p>
              ) : null}
              {!nopModalErr && !nopModalLoading && nopModalRows.length === 0 ? (
                <div className="tti-bai-nop-empty">Chưa có bài nộp cho kỳ thi này.</div>
              ) : null}
              {!nopModalErr && !nopModalLoading && nopModalRows.length > 0 ? (
                <div className="tti-nop-gallery">
                  {nopModalRows.map((b) => {
                    const urls = b.anh_bai_nop_urls ?? [];
                    return (
                      <section key={b.id} className="tti-nop-submission">
                        {urls.length > 0 ? (
                          <div className="tti-nop-img-grid">
                            {urls.map((url, idx) => (
                              <a
                                key={`${b.id}-${idx}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tti-nop-img-cell"
                                title={`Mở ảnh gốc ${idx + 1}/${urls.length}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Bài nộp ${b.ho_ten} — ảnh ${idx + 1}`}
                                  loading="lazy"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="tti-nop-empty-imgs">Không có file ảnh trong bài nộp này.</div>
                        )}
                        <footer className="tti-nop-meta">
                          <strong>{b.ho_ten}</strong>
                          <div className="tti-nop-meta-row">
                            <span className="tti-nop-meta-time">
                              {new Date(b.thoi_gian_nop).toLocaleString("vi-VN")}
                            </span>
                            {b.facebook?.trim() ? (
                              <span className="tti-nop-meta-fb">{b.facebook.trim()}</span>
                            ) : null}
                          </div>
                          {b.ghi_chu?.trim() ? (
                            <p className="tti-nop-meta-note">{b.ghi_chu.trim()}</p>
                          ) : null}
                        </footer>
                      </section>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="tti-modal-nop-foot">
              <Link
                href={`/admin/dashboard/thi-thu/${nopModalKyId}?tab=nop`}
                className="tti-modal-nop-link"
                onClick={closeNopModal}
              >
                Mở trang kỳ thi (tab Bài nộp) →
              </Link>
              <button type="button" className="tti-modal-btn" onClick={closeNopModal}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
