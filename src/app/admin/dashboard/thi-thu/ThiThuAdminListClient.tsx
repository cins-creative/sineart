"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  const [monFilter, setMonFilter] = useState<"" | MonThiKey>("");
  const [stFilter, setStFilter] = useState<"" | ThiThuTrangThai>("");

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
        <Link href="/admin/dashboard/thi-thu/new" className="tti-adm-cta">
          + Tạo kỳ thi mới
        </Link>
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

      <div className="overflow-x-auto">
        <table className="tti-adm-tbl">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Ảnh</th>
              <th>Tiêu đề</th>
              <th style={{ width: 100 }}>Môn</th>
              <th style={{ width: 130 }}>Giờ bắt đầu</th>
              <th style={{ width: 90 }}>Trạng thái</th>
              <th style={{ width: 48 }}>Bài</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const cfg = getMonConfig(r.mon_thi as MonThiKey);
              const mon = r.mon_thi as MonThiKey;
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
                  <td style={{ fontSize: 11 }}>
                    {new Date(r.thoi_gian_bat_dau).toLocaleString("vi-VN")}
                  </td>
                  <td>
                    <span className={r.trang_thai === "published" ? "tti-sp tti-sp-p" : "tti-sp tti-sp-d"}>
                      {r.trang_thai}
                    </span>
                  </td>
                  <td style={{ fontWeight: 800 }}>{counts[r.id] ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
