"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import ThiThuDeThiTab from "./ThiThuDeThiTab";
import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuBaiNopRow, ThiThuDeThiRow, ThiThuKyThiRow } from "@/types/thi-thu";

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Tab = "info" | "de" | "lich" | "nop";

export default function ThiThuEditorClient({
  initial,
  initialDeThi,
  baiNop,
}: {
  initial: ThiThuKyThiRow | null;
  initialDeThi: ThiThuDeThiRow[];
  baiNop: ThiThuBaiNopRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [saving, setSaving] = useState(false);
  const [tieuDe, setTieuDe] = useState(initial?.tieu_de ?? "");
  const [monThi, setMonThi] = useState<MonThiKey>((initial?.mon_thi as MonThiKey) ?? "hinh_hoa");
  const [t0, setT0] = useState(initial ? toDatetimeLocal(initial.thoi_gian_bat_dau) : "");
  const [glStart, setGlStart] = useState(
    initial?.thoi_gian_giai_lao_bat_dau ? toDatetimeLocal(initial.thoi_gian_giai_lao_bat_dau) : "",
  );
  const [glEnd, setGlEnd] = useState(
    initial?.thoi_gian_giai_lao_ket_thuc ? toDatetimeLocal(initial.thoi_gian_giai_lao_ket_thuc) : "",
  );
  const [thumb, setThumb] = useState(initial?.thumbnail_url ?? "");
  const [lich, setLich] = useState(initial?.lich_cham_bai_url ?? "");
  const [trangThai, setTrangThai] = useState(initial?.trang_thai ?? "draft");

  const cfg = useMemo(() => getMonConfig(monThi), [monThi]);

  const saveKy = useCallback(async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        id: initial?.id,
        tieu_de: tieuDe.trim(),
        mon_thi: monThi,
        thoi_gian_bat_dau: t0 ? new Date(t0).toISOString() : null,
        thoi_gian_giai_lao_bat_dau: monThi === "hinh_hoa" && glStart ? new Date(glStart).toISOString() : null,
        thoi_gian_giai_lao_ket_thuc: monThi === "hinh_hoa" && glEnd ? new Date(glEnd).toISOString() : null,
        thumbnail_url: thumb.trim() || null,
        lich_cham_bai_url: lich.trim() || null,
        trang_thai: trangThai,
      };
      const res = await fetch("/admin/api/thi-thu-upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Lưu thất bại");
      if (!initial?.id && j.id) {
        router.replace(`/admin/dashboard/thi-thu/${j.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }, [
    glEnd,
    glStart,
    initial?.id,
    lich,
    monThi,
    router,
    t0,
    thumb,
    tieuDe,
    trangThai,
  ]);

  const exportCsv = useCallback(() => {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [
      ["ho_ten", "facebook", "ghi_chu", "thoi_gian_nop", "so_anh"].join(","),
      ...baiNop.map((b) =>
        [
          esc(b.ho_ten),
          esc(b.facebook ?? ""),
          esc(b.ghi_chu ?? ""),
          esc(new Date(b.thoi_gian_nop).toISOString()),
          String(b.anh_bai_nop_urls?.length ?? 0),
        ].join(","),
      ),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `thi-thu-bai-nop-${initial?.id ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [baiNop, initial?.id]);

  const tabLabels: Record<Tab, string> = {
    info: "Thông tin",
    de: "Đề thi",
    lich: "Lịch chấm bài",
    nop: "Bài nộp",
  };

  return (
    <div className="sa-thi-thu-admin mx-auto max-w-4xl px-4 py-8">
      <div className="tti-adm-editor-hd">
        <Link href="/admin/dashboard/thi-thu" className="tti-adm-back">
          ← Danh sách
        </Link>
        {initial?.id ? (
          <div className="tti-adm-prev-links">
            <a
              href={`/thi-thu/${initial.id}?preview=countdown`}
              target="_blank"
              rel="noreferrer"
              className="tti-adm-prev-a"
            >
              Preview countdown ↗
            </a>
            <a
              href={`/thi-thu/${initial.id}?preview=exam_1`}
              target="_blank"
              rel="noreferrer"
              className="tti-adm-prev-a"
            >
              Preview exam ↗
            </a>
          </div>
        ) : null}
      </div>

      <h1 className="tti-adm-editor-title">{initial ? "Sửa kỳ thi" : "Tạo kỳ thi mới"}</h1>

      <div className="tti-adm-tabs">
        {(["info", "de", "lich", "nop"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`tti-adm-tab ${tab === k ? "on" : ""}`}
            onClick={() => setTab(k)}
          >
            {tabLabels[k]}
            {k === "nop" && baiNop.length > 0 ? (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "rgba(238,91,159,.15)",
                  color: "#ee5b9f",
                  fontWeight: 800,
                }}
              >
                {baiNop.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "info" ? (
        <div className="tti-adm-fc mt-4 space-y-0">
          <div className="tti-f-group">
            <label className="tti-f-lbl">Thumbnail (cover 16:9)</label>
            <label className="tti-upload-zone">
              Click hoặc chọn ảnh cover
              <span>jpg, png, webp — khuyến nghị 1280×720px</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await uploadAdminCfImage(f, f.name);
                  setThumb(url);
                }}
              />
            </label>
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="mt-3 max-h-40 rounded-lg object-cover" />
            ) : null}
          </div>

          <div className="tti-f-group">
            <label className="tti-f-lbl">Tiêu đề kỳ thi *</label>
            <input className="tti-f-in" value={tieuDe} onChange={(e) => setTieuDe(e.target.value)} />
          </div>

          <div className="tti-f-row">
            <div className="tti-f-group">
              <label className="tti-f-lbl">Môn thi *</label>
              <select
                className="tti-f-in"
                value={monThi}
                onChange={(e) => setMonThi(e.target.value as MonThiKey)}
              >
                <option value="hinh_hoa">Hình họa — 360 phút</option>
                <option value="trang_tri_mau">Trang trí màu — 270 phút</option>
                <option value="bo_cuc_mau">Bố cục màu — 300 phút</option>
              </select>
            </div>
            <div className="tti-f-group">
              <label className="tti-f-lbl">Giờ bắt đầu *</label>
              <input
                type="datetime-local"
                className="tti-f-in"
                value={t0}
                onChange={(e) => setT0(e.target.value)}
              />
            </div>
          </div>

          {cfg.co_giai_lao ? (
            <div className="tti-gl-box">
              <div className="tti-gl-box-ttl">Giải lao (chỉ Hình họa)</div>
              <div className="tti-f-row">
                <div className="tti-f-group">
                  <label className="tti-f-lbl">Bắt đầu giải lao</label>
                  <input
                    type="datetime-local"
                    className="tti-f-in"
                    value={glStart}
                    onChange={(e) => setGlStart(e.target.value)}
                  />
                </div>
                <div className="tti-f-group">
                  <label className="tti-f-lbl">Kết thúc giải lao</label>
                  <input
                    type="datetime-local"
                    className="tti-f-in"
                    value={glEnd}
                    onChange={(e) => setGlEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="tti-f-group">
            <div className="tti-tog-row">
              <button
                type="button"
                className={`tti-tog ${trangThai === "draft" ? "off" : ""}`}
                aria-pressed={trangThai === "published"}
                onClick={() => setTrangThai((s) => (s === "published" ? "draft" : "published"))}
              />
              <span className={`tti-tog-lbl ${trangThai === "published" ? "grad" : "muted"}`}>
                {trangThai === "published" ? "Published — đang công bố" : "Draft — chưa công bố"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving || !tieuDe.trim() || !t0}
              className="tti-save-btn"
              onClick={() => void saveKy()}
            >
              {saving ? "Đang lưu…" : initial?.id ? "Lưu thông tin" : "Lưu và tiếp tục →"}
            </button>
            {initial?.id ? (
              <span className="text-[11px] text-[rgba(45,32,32,0.55)]">
                <code>/thi-thu/{initial.id}</code>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "de" && initial?.id ? (
        <div className="mt-4">
          <ThiThuDeThiTab kyId={initial.id} initialRows={initialDeThi} />
        </div>
      ) : null}
      {tab === "de" && !initial?.id ? (
        <p className="mt-6 text-[rgba(45,32,32,0.55)]">Lưu thông tin kỳ thi trước, sau đó chỉnh đề thi.</p>
      ) : null}

      {tab === "lich" ? (
        <div className="tti-adm-fc mt-4">
          <div className="tti-f-group">
            <label className="tti-f-lbl">Ảnh lịch chấm bài</label>
            <p className="mb-2 text-[12px] leading-relaxed text-[rgba(45,32,32,0.55)]">
              Ảnh hiển thị sau khi buổi thi kết thúc (trang kết thúc phòng thi).
            </p>
            <label className="tti-upload-zone">
              Đổi ảnh lịch chấm
              <span>jpg, png, webp</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await uploadAdminCfImage(f, f.name);
                  setLich(url);
                }}
              />
            </label>
            {lich ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lich} alt="" className="mt-4 max-h-64 rounded-xl object-contain" />
            ) : null}
          </div>
          <button type="button" disabled={saving} className="tti-save-btn" onClick={() => void saveKy()}>
            Lưu lịch chấm
          </button>
        </div>
      ) : null}

      {tab === "nop" ? (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] font-bold text-[#2d2020]">{baiNop.length} bài nộp</span>
            <button type="button" className="tti-view-btn" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="tti-bai-nop-tbl">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Họ tên</th>
                  <th>Facebook</th>
                  <th style={{ width: 110 }}>Giờ nộp</th>
                  <th style={{ width: 56 }}>Ảnh</th>
                </tr>
              </thead>
              <tbody>
                {baiNop.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>{b.ho_ten}</td>
                    <td style={{ fontSize: 11, color: "rgba(45,32,32,0.55)" }}>{b.facebook ?? "—"}</td>
                    <td style={{ fontSize: 11 }}>
                      {new Date(b.thoi_gian_nop).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ fontWeight: 800 }}>{b.anh_bai_nop_urls?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
