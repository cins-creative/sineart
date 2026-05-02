"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import type { ThiThuDeThiItem } from "@/types/thi-thu";

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
  const [deUpload, setDeUpload] = useState<{ idx: number; cur: number; total: number } | null>(null);
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

      {items.map((row, idx) => (
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
            <label
              aria-busy={deUpload?.idx === idx}
              className={`tti-de-add-img inline-flex items-center gap-2 border border-dashed ${deUpload?.idx === idx ? "is-busy" : ""} ${readOnly ? "pointer-events-none opacity-45" : "cursor-pointer"}`}
            >
              {deUpload?.idx === idx ? (
                <>
                  <span className="tti-spinner tti-spinner--sm" aria-hidden />
                  {deUpload.total > 1
                    ? `Đang tải ${deUpload.cur}/${deUpload.total}…`
                    : "Đang tải ảnh…"}
                </>
              ) : (
                "+ Thêm ảnh"
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={readOnly || (deUpload !== null && deUpload.idx === idx)}
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  if (!files?.length) return;
                  const list = Array.from(files);
                  setDeUploadErr((m) => {
                    const n = { ...m };
                    delete n[idx];
                    return n;
                  });
                  setDeUpload({ idx, cur: 0, total: list.length });
                  const urlList: string[] = [];
                  try {
                    for (let i = 0; i < list.length; i++) {
                      const f = list[i]!;
                      setDeUpload({ idx, cur: i + 1, total: list.length });
                      const url = await uploadAdminCfImage(f, f.name);
                      urlList.push(url);
                    }
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
                    setDeUpload(null);
                  }
                }}
              />
            </label>
            {deUploadErr[idx] ? (
              <p className="tti-upload-err mt-1" role="alert">
                {deUploadErr[idx]}
              </p>
            ) : null}
            <div className="tti-de-imgs">
              {(row.anh_urls ?? []).map((url, ui) => (
                <div key={`${url}-${ui}`} className="tti-de-img-th">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
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
      ))}

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
