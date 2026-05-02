"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  computeExamEndMs,
  computeListCardStatus,
  listCardStatusLabel,
} from "@/lib/thi-thu/phase";
import type { ListCardStatus } from "@/lib/thi-thu/phase";
import { computeKyListSortKey, formatThoiGianSuaBaiLabel } from "@/lib/thi-thu/replay-time";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuKyThiRow } from "@/types/thi-thu";

const OPEN_ROOM_MS = 15 * 60 * 1000;

function fmtDayHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function imgCls(mon: MonThiKey): string {
  if (mon === "hinh_hoa") return "tti-ttc-img-hh";
  if (mon === "trang_tri_mau") return "tti-ttc-img-tt";
  return "tti-ttc-img-bc";
}

function badgeCls(mon: MonThiKey): string {
  if (mon === "hinh_hoa") return "tti-b-hh";
  if (mon === "trang_tri_mau") return "tti-b-tt";
  return "tti-b-bc";
}

function statusBarStyle(mon: MonThiKey): CSSProperties {
  if (mon === "hinh_hoa") return { background: "linear-gradient(90deg,#fde859,#f0c000)" };
  if (mon === "trang_tri_mau") return { background: "linear-gradient(90deg,#f8a668,#ee5b9f)" };
  return { background: "linear-gradient(90deg,#6efec0,#00c8a0)" };
}

function dotCls(st: ListCardStatus): string {
  if (st === "sap_dien_ra") return "tti-dot-y";
  if (st === "dang_mo_phong") return "tti-dot-g";
  if (st === "dang_thi") return "tti-dot-r";
  return "tti-dot-n";
}

export default function ThiThuListClient({ rows }: { rows: ThiThuKyThiRow[] }) {
  const [offsetMs, setOffsetMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/thi-thu/clock");
      const j = (await res.json()) as { serverMs?: number };
      if (!cancelled && typeof j.serverMs === "number") {
        setOffsetMs(j.serverMs - Date.now());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const now = Date.now() + offsetMs;

  const cards = useMemo(() => {
    const enriched = rows.map((row) => {
      const mon = row.mon_thi as MonThiKey;
      const cfg = getMonConfig(mon);
      const T = new Date(row.thoi_gian_bat_dau).getTime();
      const endMs = computeExamEndMs(T, cfg.thoi_luong_phut);
      const st = computeListCardStatus(T, cfg.thoi_luong_phut, now);
      const roomOpen = now >= T - OPEN_ROOM_MS;
      const sortKey = computeKyListSortKey({
        thoiGianBatDauIso: row.thoi_gian_bat_dau,
        thoiLuongPhut: cfg.thoi_luong_phut,
        thoiGianSuaBaiRaw: row.thoi_gian_sua_bai,
        now,
      });
      return { row, mon, cfg, T, endMs, st, roomOpen, sortKey };
    });
    enriched.sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return a.row.thoi_gian_bat_dau.localeCompare(b.row.thoi_gian_bat_dau);
    });
    return enriched;
  }, [rows, now]);

  if (rows.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-sm text-neutral-600" style={{ background: "var(--tti-bg, #fdf7f3)" }}>
        Chưa có kỳ thi nào được công bố.
      </div>
    );
  }

  return (
    <div className="tti-grid3">
      {cards.map(({ row, mon, cfg, st, roomOpen }) => {
        const canEnter = roomOpen && st !== "da_ket_thuc";
        const suaLabel =
          st === "da_ket_thuc"
            ? formatThoiGianSuaBaiLabel(row.thoi_gian_bat_dau, row.thoi_gian_sua_bai)
            : null;
        const yt = row.video_sua_bai?.trim() ?? "";
        return (
          <article key={row.id} className="tti-ttc">
            <div className={`tti-ttc-img ${imgCls(mon)}`}>
              {row.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.thumbnail_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="tti-ttc-img-icon" aria-hidden>
                  {mon === "hinh_hoa" ? "✏" : mon === "trang_tri_mau" ? "🎨" : "🖼"}
                </span>
              )}
              <div className="tti-ttc-status-bar" style={statusBarStyle(mon)} />
            </div>
            <div className="tti-ttc-b">
              <span className={`tti-badge ${badgeCls(mon)}`}>{cfg.label}</span>
              <h2>{row.tieu_de}</h2>
              <p className="tti-ttc-meta">{fmtDayHour(row.thoi_gian_bat_dau)}</p>
              <p className="tti-ttc-state">
                <span className={`tti-dot-live ${dotCls(st)}`} aria-hidden />
                {listCardStatusLabel(st)}
              </p>
              {suaLabel ? (
                <p className="tti-ttc-sua">
                  <span className="tti-ttc-sua-k">Lịch sửa bài:</span> {suaLabel}
                </p>
              ) : null}
              {canEnter ? (
                <Link href={`/thi-thu/${row.id}`} className="tti-ttc-btn tti-btn-grad">
                  Vào phòng thi →
                </Link>
              ) : (
                <span className="tti-ttc-btn tti-btn-off">
                  {st === "da_ket_thuc" ? "Đã kết thúc" : "Chưa mở phòng"}
                </span>
              )}
              {st === "da_ket_thuc" && yt ? (
                <a
                  href={yt}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tti-ttc-btn tti-btn-yt"
                >
                  Xem video sửa bài ↗
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
