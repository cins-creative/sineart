"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import ThiThuDeThiTab from "./ThiThuDeThiTab";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { parseThoiGianSuaBaiMs } from "@/lib/thi-thu/replay-time";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuBaiNopRow, ThiThuDeThiRow, ThiThuKyThiRow } from "@/types/thi-thu";

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function suaBaiToDatetimeLocal(row: ThiThuKyThiRow): string {
  if (!row.thoi_gian_sua_bai) return "";
  const ms = parseThoiGianSuaBaiMs(row.thoi_gian_bat_dau, row.thoi_gian_sua_bai);
  if (ms == null) return "";
  return toDatetimeLocal(new Date(ms).toISOString());
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
  const { canEditThiThuKy } = useAdminDashboardAbilities();
  const readOnly = !canEditThiThuKy;
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
  const [thoiGianSuaBaiLocal, setThoiGianSuaBaiLocal] = useState(
    initial ? suaBaiToDatetimeLocal(initial) : "",
  );
  const [videoSuaBai, setVideoSuaBai] = useState(initial?.video_sua_bai ?? "");
  const [trangThai, setTrangThai] = useState(initial?.trang_thai ?? "draft");

  const cfg = useMemo(() => getMonConfig(monThi), [monThi]);

  const saveKy = useCallback(async () => {
    if (readOnly) return;
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
        thoi_gian_sua_bai: thoiGianSuaBaiLocal ? new Date(thoiGianSuaBaiLocal).toISOString() : null,
        video_sua_bai: videoSuaBai.trim() || null,
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
    thoiGianSuaBaiLocal,
    thumb,
    readOnly,
    tieuDe,
    trangThai,
    videoSuaBai,
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
    <div className="sa-thi-thu-admin flex min-h-0 w-full min-w-0 max-w-6xl flex-1 flex-col px-4 py-6 md:py-8 mx-auto">
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

      {readOnly ? (
        <div
          className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-950"
          role="status"
        >
          Bạn chỉ xem — không có quyền tạo hoặc sửa kỳ thi (cần vai trò nhân viên, quản lý hoặc admin).
        </div>
      ) : null}

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
        <div className="tti-adm-fc tti-adm-fc--editor mt-4">
          <div className="tti-f-group">
            <label className="tti-f-lbl">Thumbnail (cover 16:9)</label>
            <label className={`tti-upload-zone ${readOnly ? "pointer-events-none opacity-50" : ""}`}>
              Click hoặc chọn ảnh cover
              <span>jpg, png, webp — khuyến nghị 1280×720px</span>
              <input
                type="file"
                accept="image/*"
                disabled={readOnly}
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
              <img src={thumb} alt="" className="tti-upload-preview max-h-40" />
            ) : null}
          </div>

          <div className="tti-f-group">
            <label htmlFor="tti-ky-tieu-de" className="tti-f-lbl">
              Tiêu đề kỳ thi *
            </label>
            <input
              id="tti-ky-tieu-de"
              className="tti-f-in"
              readOnly={readOnly}
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
            />
          </div>

          <div className="tti-f-row">
            <div className="tti-f-group">
              <label htmlFor="tti-ky-mon" className="tti-f-lbl">
                Môn thi *
              </label>
              <select
                id="tti-ky-mon"
                className="tti-f-in"
                disabled={readOnly}
                value={monThi}
                onChange={(e) => setMonThi(e.target.value as MonThiKey)}
              >
                <option value="hinh_hoa">Hình họa — 360 phút</option>
                <option value="trang_tri_mau">Trang trí màu — 270 phút</option>
                <option value="bo_cuc_mau">Bố cục màu — 300 phút</option>
              </select>
            </div>
            <div className="tti-f-group">
              <label htmlFor="tti-ky-t0" className="tti-f-lbl">
                Giờ bắt đầu *
              </label>
              <input
                id="tti-ky-t0"
                type="datetime-local"
                className="tti-f-in"
                readOnly={readOnly}
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
                    readOnly={readOnly}
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
            <label htmlFor="tti-ky-sua-time" className="tti-f-lbl">
              Thời gian phát video sửa bài
            </label>
            <p className="tti-f-hint">
              Có thể chọn ngay lúc tạo kỳ. Giờ phát lại thường cùng ngày với buổi thi; có thể chọn ngày giờ
              khác nếu lịch phát nằm hôm sau.
            </p>
            <input
              id="tti-ky-sua-time"
              type="datetime-local"
              className="tti-f-in"
              readOnly={readOnly}
              value={thoiGianSuaBaiLocal}
              onChange={(e) => setThoiGianSuaBaiLocal(e.target.value)}
            />
          </div>

          <div className="tti-f-group">
            <label htmlFor="tti-ky-yt" className="tti-f-lbl">
              Link Youtube sửa bài
            </label>
            <p className="tti-f-hint">Thường điền sau khi kỳ thi kết thúc và đã có link phát lại.</p>
            <input
              id="tti-ky-yt"
              type="url"
              className="tti-f-in"
              placeholder="https://www.youtube.com/..."
              readOnly={readOnly}
              value={videoSuaBai}
              onChange={(e) => setVideoSuaBai(e.target.value)}
            />
          </div>

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
              disabled={readOnly || saving || !tieuDe.trim() || !t0}
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
          <ThiThuDeThiTab kyId={initial.id} initialRows={initialDeThi} readOnly={readOnly} />
        </div>
      ) : null}
      {tab === "de" && !initial?.id ? (
        <p className="mt-6 text-[rgba(45,32,32,0.55)]">Lưu thông tin kỳ thi trước, sau đó chỉnh đề thi.</p>
      ) : null}

      {tab === "lich" ? (
        <div className="tti-adm-fc tti-adm-fc--editor mt-4">
          <div className="tti-f-group">
            <span className="tti-f-lbl">Ảnh lịch chấm bài</span>
            <p className="tti-f-hint">
              Ảnh hiển thị sau khi buổi thi kết thúc (trang kết thúc phòng thi).
            </p>
            <label className={`tti-upload-zone ${readOnly ? "pointer-events-none opacity-50" : ""}`}>
              Đổi ảnh lịch chấm
              <span>jpg, png, webp</span>
              <input
                type="file"
                accept="image/*"
                disabled={readOnly}
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
              <img src={lich} alt="" className="tti-upload-preview tti-upload-preview--contain max-h-64" />
            ) : null}
          </div>
          <button
            type="button"
            disabled={readOnly || saving}
            className="tti-save-btn"
            onClick={() => void saveKy()}
          >
            Lưu lịch chấm
          </button>
        </div>
      ) : null}

      {tab === "nop" ? (
        <div className="tti-bai-nop-shell mt-4">
          <div className="tti-bai-nop-toolbar">
            <div className="tti-bai-nop-toolbar-text">
              <span className="tti-bai-nop-kicker">Bài nộp học viên</span>
              <strong className="tti-bai-nop-count">{baiNop.length}</strong>
              <span className="tti-bai-nop-count-lbl">bài trong kỳ này</span>
            </div>
            <button type="button" className="tti-csv-btn" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
          {baiNop.length === 0 ? (
            <div className="tti-bai-nop-empty">Chưa có bài nộp cho kỳ thi này.</div>
          ) : (
            <div className="tti-bai-nop-scroll">
              <table className="tti-bai-nop-tbl">
                <thead>
                  <tr>
                    <th className="tti-bai-nop-col-name">Họ tên</th>
                    <th className="tti-bai-nop-col-fb">Facebook</th>
                    <th className="tti-bai-nop-col-time">Giờ nộp</th>
                    <th className="tti-bai-nop-col-img">Ảnh</th>
                  </tr>
                </thead>
                <tbody>
                  {baiNop.map((b) => {
                    const n = b.anh_bai_nop_urls?.length ?? 0;
                    return (
                      <tr key={b.id}>
                        <td className="tti-bai-nop-cell-name">{b.ho_ten}</td>
                        <td className="tti-bai-nop-cell-fb">{b.facebook?.trim() ? b.facebook : "—"}</td>
                        <td className="tti-bai-nop-cell-time" title={new Date(b.thoi_gian_nop).toISOString()}>
                          {new Date(b.thoi_gian_nop).toLocaleString("vi-VN")}
                        </td>
                        <td className="tti-bai-nop-cell-img">
                          <span className="tti-bn-pill">{n}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
