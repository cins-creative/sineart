"use client";

import { Plus } from "lucide-react";
import { flushSync } from "react-dom";
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import type { ThiThuDeThiItem } from "@/types/thi-thu";

import ThiThuUploadProgressBar from "./ThiThuUploadProgressBar";

type Props = {
  items: ThiThuDeThiItem[];
  onChange: Dispatch<SetStateAction<ThiThuDeThiItem[]>>;
  readOnly?: boolean;
};

/**
 * Block đề thi — state do parent giữ, lưu chung với kỳ thi (`thi_thu_ky_thi.de_thi` JSON).
 */
export default function ThiThuDeThiTab({ items, onChange, readOnly = false }: Props) {
  const setRows = onChange;
  const uploadLockRef = useRef(false);
  const [deUpload, setDeUpload] = useState<{
    idx: number;
    cur: number;
    total: number;
    pct: number;
  } | null>(null);
  const [deUploadErr, setDeUploadErr] = useState<Record<number, string>>({});

  const addDe = useCallback(() => {
    if (readOnly) return;
    const maxTu = items.reduce((m, r) => Math.max(m, r.thu_tu), 0);
    setRows([
      ...items,
      { tieu_de: "", anh_urls: [], thu_tu: maxTu + 1 },
    ]);
  }, [items, readOnly, setRows]);

  const deleteRow = useCallback(
    (idx: number) => {
      if (readOnly) return;
      if (!window.confirm("Xóa đề này? (Nhớ bấm Lưu thông tin để ghi DB.)")) return;
      setRows(items.filter((_, i) => i !== idx).map((r, i) => ({ ...r, thu_tu: i + 1 })));
    },
    [items, readOnly, setRows],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-black/[0.06] bg-white/80 px-4 py-3">
        <p className="text-[13px] font-bold text-[#2d2020]">Đề thi</p>
        <p className="mt-1 text-[11px] text-[rgba(45,32,32,0.55)]">
          Tiêu đề từng đề và ảnh đề — lưu chung khi bạn bấm «Lưu thông tin» bên dưới.
        </p>
      </div>

      {readOnly ? (
        <p className="rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-[12px] text-[rgba(45,32,32,0.65)]">
          Bạn chỉ xem — không có quyền sửa đề thi.
        </p>
      ) : null}

      {items.map((row, idx) => {
        const thisRowUploading = deUpload?.idx === idx;
        return (
        <div key={`de-${idx}-${row.thu_tu}`} className="tti-de-item-w">
          <div className="tti-de-item-hd">
            <div className="tti-de-item-num">{idx + 1}</div>
            <input
              className="tti-f-in min-w-0 flex-1"
              placeholder="Tiêu đề đề thi"
              readOnly={readOnly}
              value={row.tieu_de}
              onChange={(e) => {
                const v = e.target.value;
                setRows(items.map((r, i) => (i === idx ? { ...r, tieu_de: v } : r)));
              }}
            />
            <button
              type="button"
              className="tti-de-del flex-shrink-0"
              onClick={() => deleteRow(idx)}
              disabled={readOnly}
            >
              Xóa đề
            </button>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-bold text-[#2d2020]">Ảnh đề</p>
            <div className="tti-de-upload-stack">
              {/*
                Vùng hiển thị pointer-events-none để không chặn file input (một số trình duyệt / layer
                khiến click không tới input dù z-10). Input đặt cuối, z-[100], full vùng.
              */}
              <div
                aria-busy={thisRowUploading}
                className={`tti-upload-zone relative min-h-[69px] ${thisRowUploading ? "is-busy" : ""} ${readOnly ? "pointer-events-none opacity-50" : ""}`}
              >
                <div className="pointer-events-none">
                  {deUpload?.idx === idx ? (
                    <>
                      <span className="tti-upload-zone-busy">
                        <span className="tti-spinner" aria-hidden />
                        {deUpload.total > 1
                          ? `Đang gửi ảnh ${deUpload.cur}/${deUpload.total} lên máy chủ…`
                          : "Đang gửi ảnh đề lên máy chủ…"}
                      </span>
                      <span>Không đóng trang trong lúc đang gửi file — lưu DB sau khi bấm «Lưu thông tin»</span>
                      <ThiThuUploadProgressBar
                        fullWidth
                        pct={deUpload.pct}
                        indeterminate={deUpload.pct < 5}
                        caption={
                          deUpload.total > 1
                            ? `Tiến độ chung (${deUpload.cur}/${deUpload.total} ảnh)`
                            : "Tiến độ tải lên"
                        }
                      />
                      <p className="tti-de-upload-hint" role="status">
                        Sau khi upload xong, URL nằm trong JSON đề thi; bấm «Lưu thông tin» để ghi cột de_thi.
                      </p>
                    </>
                  ) : (
                    <>
                      Click hoặc chọn ảnh đề
                      <span>jpg, png, webp — nhiều ảnh; lưu DB qua cột de_thi khi lưu kỳ thi</span>
                    </>
                  )}
                </div>
                {!readOnly ? (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={thisRowUploading}
                    className={
                      thisRowUploading
                        ? "sr-only"
                        : "absolute inset-0 z-[100] m-0 block min-h-[69px] w-full cursor-pointer opacity-0"
                    }
                    style={{ fontSize: 0 }}
                    aria-label="Chọn ảnh đề thi"
                    title="Chọn ảnh đề thi"
                    onChange={async (e) => {
                    const files = e.target.files;
                    e.target.value = "";
                    if (!files?.length) return;
                    if (uploadLockRef.current) return;

                    const list = Array.from(files);
                    uploadLockRef.current = true;

                    setDeUploadErr((m) => {
                      const n = { ...m };
                      delete n[idx];
                      return n;
                    });

                    flushSync(() => {
                      setDeUpload({ idx, cur: 1, total: list.length, pct: 2 });
                    });

                    const urlList: string[] = [];
                    try {
                      for (let i = 0; i < list.length; i++) {
                        const f = list[i]!;
                        const url = await uploadAdminCfImage(f, f.name, (filePct) => {
                          const overall = Math.round(((i + filePct / 100) / list.length) * 100);
                          setDeUpload({
                            idx,
                            cur: i + 1,
                            total: list.length,
                            pct: Math.min(99, Math.max(2, overall)),
                          });
                        });
                        urlList.push(url);
                      }
                      flushSync(() => {
                        setDeUpload({ idx, cur: list.length, total: list.length, pct: 100 });
                      });
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === idx ? { ...r, anh_urls: [...(r.anh_urls ?? []), ...urlList] } : r,
                        ),
                      );
                    } catch (err) {
                      setDeUploadErr((m) => ({
                        ...m,
                        [idx]: err instanceof Error ? err.message : "Tải ảnh thất bại.",
                      }));
                    } finally {
                      uploadLockRef.current = false;
                      setDeUpload(null);
                    }
                  }}
                  />
                ) : null}
              </div>
            </div>
            {deUploadErr[idx] ? (
              <div className="tti-upload-err-banner" role="alert">
                <strong>Lỗi tải ảnh đề.</strong> {deUploadErr[idx]}
              </div>
            ) : null}
            {(row.anh_urls ?? []).length > 0 ? (
              <p className="mt-2 text-[11px] font-semibold text-[rgba(45,32,32,0.55)]">
                Xem trước ({(row.anh_urls ?? []).length} ảnh đã upload lên Cloudflare — chưa lưu DB cho đến khi bấm «Lưu thông tin»)
              </p>
            ) : null}
            <div className="tti-de-imgs">
              {(row.anh_urls ?? []).map((url, ui) => (
                <div key={`${url}-${ui}`} className="tti-de-img-th">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <button
                    type="button"
                    className="tti-de-img-x"
                    aria-label="Xóa ảnh"
                    disabled={readOnly}
                    onClick={() =>
                      setRows(
                        items.map((r, i) =>
                          i === idx
                            ? {
                                ...r,
                                anh_urls: (r.anh_urls ?? []).filter((_, j) => j !== ui),
                              }
                            : r,
                        ),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        );
      })}

      <button
        type="button"
        className="tti-de-add-new inline-flex items-center justify-center gap-2"
        disabled={readOnly}
        onClick={addDe}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Thêm đề
      </button>
    </div>
  );
}
