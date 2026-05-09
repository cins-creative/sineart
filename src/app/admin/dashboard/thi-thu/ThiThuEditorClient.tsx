"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ThiThuDeThiTab from "./ThiThuDeThiTab";
import ThiThuUploadProgressBar from "./ThiThuUploadProgressBar";
import { useAdminDashboardAbilities } from "@/app/admin/dashboard/_components/AdminDashboardAbilitiesProvider";
import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { DEBUG_THI_THU_TITLE_PREFIX } from "@/lib/thi-thu/debug-exam";
import { normalizeDeThiForSave, parseDeThiJson } from "@/lib/thi-thu/de-thi-json";
import { parseThoiGianSuaBaiMs } from "@/lib/thi-thu/replay-time";
import { getMonConfig, type MonThiKey } from "@/lib/thi-thu-config";
import type { ThiThuEditorTab } from "@/types/thi-thu-editor";
import type { ThiThuBaiNopRow, ThiThuDeThiItem, ThiThuKyThiRow } from "@/types/thi-thu";

type SaveReportState =
  | {
      ok: true;
      title: string;
      body: string;
      detailLines?: string[];
    }
  | {
      ok: false;
      title: string;
      body: string;
      detailLines?: string[];
    };

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

export type { ThiThuEditorTab };

export default function ThiThuEditorClient({
  initial,
  baiNop,
  initialTab,
  initialSavedFlash,
}: {
  initial: ThiThuKyThiRow | null;
  baiNop: ThiThuBaiNopRow[];
  /** Từ query `?tab=` */
  initialTab?: ThiThuEditorTab;
  /** Một lần sau `POST` tạo kỳ — query `?saved=1` */
  initialSavedFlash?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { canEditThiThuKy } = useAdminDashboardAbilities();
  const readOnly = !canEditThiThuKy;
  const [tab, setTab] = useState<ThiThuEditorTab>(initialTab ?? "info");
  const [saving, setSaving] = useState(false);
  const [saveReport, setSaveReport] = useState<SaveReportState | null>(null);
  const [uploadThumbBusy, setUploadThumbBusy] = useState(false);
  const [uploadLichBusy, setUploadLichBusy] = useState(false);
  const [uploadThumbPct, setUploadThumbPct] = useState(0);
  const [uploadLichPct, setUploadLichPct] = useState(0);
  const [uploadThumbErr, setUploadThumbErr] = useState<string | null>(null);
  const [uploadLichErr, setUploadLichErr] = useState<string | null>(null);
  const clearedSavedFlash = useRef(false);
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
  const [deThiItems, setDeThiItems] = useState<ThiThuDeThiItem[]>(() =>
    parseDeThiJson(initial?.de_thi ?? null),
  );
  /** Luôn trùng state `deThiItems` mới nhất khi gọi `saveKy` (tránh race: thêm URL rồi bấm Lưu ngay). */
  const deThiItemsRef = useRef(deThiItems);
  deThiItemsRef.current = deThiItems;

  /** Chỉ hydrate lại đề thi khi đổi kỳ (id). Không phụ thuộc `initial` trọn vẹn — tránh reset sau mỗi re-render RSC và xóa ảnh upload Cloudflare chưa lưu. */
  useEffect(() => {
    if (!initial?.id) return;
    setDeThiItems(parseDeThiJson(initial.de_thi ?? null));
    // Chỉ sync khi đổi kỳ (id), không khi `initial.de_thi` refresh từ server
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  useEffect(() => {
    if (!initialSavedFlash || clearedSavedFlash.current || !initial?.id) return;
    clearedSavedFlash.current = true;
    setSaveReport({
      ok: true,
      title: "Lưu thành công",
      body: "Kỳ thi mới đã được tạo và ghi vào cơ sở dữ liệu.",
      detailLines: [
        `Mã kỳ thi (admin): ${initial.id}`,
        `Trang công khai: /thi-thu/${initial.id}`,
      ],
    });
    router.replace(pathname);
  }, [initial?.id, initialSavedFlash, pathname, router]);

  const cfg = useMemo(() => getMonConfig(monThi), [monThi]);

  /** Form «Tạo kỳ mới»: preset để test phòng thi với thời lượng 3 phút (xem `debug-exam.ts`). */
  const fillDebugMockKy = useCallback(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 2);
    setTieuDe(`${DEBUG_THI_THU_TITLE_PREFIX}Kiểm tra phòng thi`);
    setMonThi("trang_tri_mau");
    setT0(toDatetimeLocal(d.toISOString()));
    setGlStart("");
    setGlEnd("");
    setDeThiItems([{ tieu_de: "Đề mock", anh_urls: [], thu_tu: 1 }]);
    setTrangThai("published");
  }, []);

  const saveKy = useCallback(async () => {
    if (readOnly) return;
    setSaving(true);
    setSaveReport(null);
    try {
      if (thoiGianSuaBaiLocal.trim() && t0.trim()) {
        const msStart = new Date(t0).getTime();
        const msSua = new Date(thoiGianSuaBaiLocal).getTime();
        if (
          Number.isFinite(msStart) &&
          Number.isFinite(msSua) &&
          msStart === msSua
        ) {
          setSaveReport({
            ok: false,
            title: "Thời gian không hợp lệ",
            body:
              "Buổi phát video sửa bài là một phiên riêng — không được trùng đúng giờ bắt đầu kỳ thi. Hãy chọn ngày giờ khác (thường sau khi kết thúc làm bài / ngày khác).",
          });
          setSaving(false);
          return;
        }
      }
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
        de_thi: normalizeDeThiForSave(deThiItemsRef.current),
        trang_thai: trangThai,
      };
      const res = await fetch("/admin/api/thi-thu-upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !j.ok) {
        setSaveReport({
          ok: false,
          title: "Lưu thất bại",
          body: typeof j.error === "string" && j.error.trim() ? j.error : "Không ghi được dữ liệu.",
          detailLines: [`Mã phản hồi HTTP: ${res.status}`],
        });
        return;
      }
      const rowId = typeof j.id === "string" ? j.id : initial?.id;
      if (initial?.id) {
        setSaveReport({
          ok: true,
          title: "Lưu thành công",
          body: "Thông tin kỳ thi đã được cập nhật.",
          detailLines: rowId
            ? [
                `Mã kỳ thi: ${rowId}`,
                `Trạng thái: ${trangThai === "published" ? "Công bố" : "Nháp"}`,
                `Số đề thi: ${deThiItemsRef.current.length}`,
              ]
            : undefined,
        });
        router.refresh();
      } else if (typeof j.id === "string" && j.id) {
        router.replace(`/admin/dashboard/thi-thu/${j.id}?saved=1`);
      }
    } catch (e) {
      setSaveReport({
        ok: false,
        title: "Lưu thất bại",
        body:
          e instanceof Error
            ? e.message
            : "Không lưu được. Kiểm tra quyền vai trò và Supabase (service_role, cột bảng).",
      });
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

  const tabLabels: Record<ThiThuEditorTab, string> = {
    info: "Thông tin",
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

      {!initial?.id && !readOnly ? (
        <div className="mb-4 rounded-xl border border-violet-200/80 bg-violet-50/90 px-4 py-3">
          <p className="text-[12px] font-bold text-violet-950">Kỳ DEBUG — thi 3 phút</p>
          <p className="mt-1 text-[11px] leading-snug text-violet-900/85">
            Tiêu đề có prefix{" "}
            <code className="rounded bg-black/[0.06] px-1 font-mono text-[10px]">{DEBUG_THI_THU_TITLE_PREFIX.trimEnd()}</code> để
            rút thời lượng làm bài còn 3 phút trên trang /thi-thu. Đặt môn «Trang trí màu» (không giải lao). Giờ bắt đầu gợi ý +2 phút — có thể sửa.
          </p>
          <button
            type="button"
            className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-violet-700"
            onClick={fillDebugMockKy}
          >
            Điền nhanh các trường
          </button>
        </div>
      ) : null}

      {readOnly ? (
        <div
          className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-950"
          role="status"
        >
          Bạn chỉ xem — không có quyền tạo hoặc sửa kỳ thi (cần vai trò nhân viên, quản lý hoặc admin).
        </div>
      ) : null}

      <div className="tti-adm-tabs">
        {(["info", "nop"] as const).map((k) => (
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
        <div className="tti-adm-editor-stack mt-4">
          <section className="tti-adm-session" aria-labelledby="tti-sess-cover">
            <header className="tti-adm-session-hd">
              <span className="tti-adm-session-ix" aria-hidden>
                01
              </span>
              <h2 id="tti-sess-cover" className="tti-adm-session-ttl">
                Hiển thị trên danh sách
              </h2>
            </header>
            <div className="tti-adm-session-bd">
              <div className="tti-adm-session-split">
                <div className="tti-f-group">
                  <label className="tti-f-lbl">Thumbnail (cover 16:9)</label>
                  <label
                    aria-busy={uploadThumbBusy}
                    className={`tti-upload-zone relative ${uploadThumbBusy ? "is-busy" : ""} ${readOnly ? "pointer-events-none opacity-50" : ""}`}
                  >
                    {uploadThumbBusy ? (
                      <>
                        <span className="tti-upload-zone-busy">
                          <span className="tti-spinner" aria-hidden />
                          Đang tải ảnh cover lên máy chủ…
                        </span>
                        <span>Không đóng trang trong lúc đang gửi file</span>
                        <ThiThuUploadProgressBar pct={uploadThumbPct} fullWidth caption="Tiến độ tải lên" />
                      </>
                    ) : (
                      <>
                        Click hoặc chọn ảnh cover
                        <span>jpg, png, webp — khuyến nghị 1280×720px</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={readOnly || uploadThumbBusy}
                      className={
                        readOnly || uploadThumbBusy
                          ? "sr-only"
                          : "absolute inset-0 z-10 m-0 block h-full w-full cursor-pointer opacity-0"
                      }
                      style={{ fontSize: 0 }}
                      title="Chọn ảnh cover"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setUploadThumbErr(null);
                        setUploadThumbPct(0);
                        setUploadThumbBusy(true);
                        try {
                          const url = await uploadAdminCfImage(f, f.name, (p) => setUploadThumbPct(p));
                          setThumb(url);
                        } catch (err) {
                          setUploadThumbErr(err instanceof Error ? err.message : "Tải ảnh thất bại.");
                        } finally {
                          setUploadThumbBusy(false);
                          setUploadThumbPct(0);
                        }
                      }}
                    />
                  </label>
                  {uploadThumbErr ? (
                    <p className="tti-upload-err" role="alert">
                      {uploadThumbErr}
                    </p>
                  ) : null}
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
              </div>
            </div>
          </section>

          <section className="tti-adm-session" aria-labelledby="tti-sess-schedule">
            <header className="tti-adm-session-hd">
              <span className="tti-adm-session-ix" aria-hidden>
                02
              </span>
              <h2 id="tti-sess-schedule" className="tti-adm-session-ttl">
                Lịch buổi thi
              </h2>
            </header>
            <div className="tti-adm-session-bd">
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

            </div>
          </section>

          <section className="tti-adm-session" aria-labelledby="tti-sess-after">
            <header className="tti-adm-session-hd">
              <span className="tti-adm-session-ix" aria-hidden>
                03
              </span>
              <h2 id="tti-sess-after" className="tti-adm-session-ttl">
                Sau buổi thi
              </h2>
            </header>
            <div className="tti-adm-session-bd">
          <div className="tti-f-group">
            <label htmlFor="tti-ky-sua-time" className="tti-f-lbl">
              Thời gian phát video sửa bài
            </label>
            <p className="tti-f-hint">
              Đây là phiên phát video sau buổi thi — phải khác hoàn toàn với «Giờ bắt đầu» ở phần lịch thi
              (không trùng ngày giờ). Có thể đặt trước cùng ngày nhưng sau giờ làm bài, hoặc ngày khác.
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
            <span className="tti-f-lbl">Ảnh lịch chấm bài</span>
            <p className="tti-f-hint">
              Hiển thị sau buổi thi và trong phòng thi (thanh chạy) khi học viên đang làm bài — nhắc ngày chấm / live chữa.
            </p>
            <label
              aria-busy={uploadLichBusy}
              className={`tti-upload-zone relative ${uploadLichBusy ? "is-busy" : ""} ${readOnly ? "pointer-events-none opacity-50" : ""}`}
            >
              {uploadLichBusy ? (
                <>
                  <span className="tti-upload-zone-busy">
                    <span className="tti-spinner" aria-hidden />
                    Đang tải ảnh lịch chấm lên máy chủ…
                  </span>
                  <span>Không đóng trang trong lúc đang gửi file</span>
                  <ThiThuUploadProgressBar pct={uploadLichPct} fullWidth caption="Tiến độ tải lên" />
                </>
              ) : (
                <>
                  Click hoặc chọn ảnh lịch chấm
                  <span>jpg, png, webp</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={readOnly || uploadLichBusy}
                className={
                  readOnly || uploadLichBusy
                    ? "sr-only"
                    : "absolute inset-0 z-10 m-0 block h-full w-full cursor-pointer opacity-0"
                }
                style={{ fontSize: 0 }}
                title="Chọn ảnh lịch chấm"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setUploadLichErr(null);
                  setUploadLichPct(0);
                  setUploadLichBusy(true);
                  try {
                    const url = await uploadAdminCfImage(f, f.name, (p) => setUploadLichPct(p));
                    setLich(url);
                  } catch (err) {
                    setUploadLichErr(err instanceof Error ? err.message : "Tải ảnh thất bại.");
                  } finally {
                    setUploadLichBusy(false);
                    setUploadLichPct(0);
                  }
                }}
              />
            </label>
            {uploadLichErr ? (
              <p className="tti-upload-err" role="alert">
                {uploadLichErr}
              </p>
            ) : null}
            {lich ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lich} alt="" className="tti-upload-preview tti-upload-preview--contain max-h-64" />
            ) : null}
          </div>

            </div>
          </section>

          <section className="tti-adm-session" aria-labelledby="tti-sess-dethi">
            <header className="tti-adm-session-hd">
              <span className="tti-adm-session-ix" aria-hidden>
                04
              </span>
              <h2 id="tti-sess-dethi" className="tti-adm-session-ttl">
                Đề thi
              </h2>
            </header>
            <div className="tti-adm-session-bd">
              <ThiThuDeThiTab
                variant="embedded"
                items={deThiItems}
                onChange={setDeThiItems}
                readOnly={readOnly}
              />
            </div>
          </section>

          <section className="tti-adm-session" aria-labelledby="tti-sess-pub">
            <header className="tti-adm-session-hd">
              <span className="tti-adm-session-ix" aria-hidden>
                05
              </span>
              <h2 id="tti-sess-pub" className="tti-adm-session-ttl">
                Công bố và lưu
              </h2>
            </header>
            <div className="tti-adm-session-bd tti-adm-session-bd--footer">
          <div className="tti-f-group">
            <div className="tti-tog-row">
              <button
                type="button"
                className={`tti-tog ${trangThai === "draft" ? "off" : ""}`}
                aria-pressed={trangThai === "published"}
                disabled={readOnly}
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
          </section>
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

      {saveReport ? (
        <div
          className="tti-modal-overlay"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setSaveReport(null);
          }}
        >
          <div
            className="tti-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tti-save-report-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="tti-save-report-title"
              className={`tti-modal-title ${saveReport.ok ? "tti-modal-title--ok" : "tti-modal-title--err"}`}
            >
              {saveReport.title}
            </h2>
            <p className="tti-modal-body">{saveReport.body}</p>
            {saveReport.detailLines?.length ? (
              <ul className="tti-modal-detail">
                {saveReport.detailLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
            <div className="tti-modal-actions">
              <button type="button" className="tti-modal-btn" onClick={() => setSaveReport(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
