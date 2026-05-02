"use client";

import { Plus } from "lucide-react";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { flushSync } from "react-dom";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { cfResolvedImageUrl } from "@/lib/cfImageUrl";
import type { ThiThuDeThiItem } from "@/types/thi-thu";

type Props = {
  items: ThiThuDeThiItem[];
  onChange: Dispatch<SetStateAction<ThiThuDeThiItem[]>>;
  readOnly?: boolean;
};

/** Một dòng đề — upload ảnh file qua `/admin/api/upload-cf-image`; «Lưu thông tin» ghi `de_thi`. */
function DeThiRow({
  row,
  idx,
  readOnly,
  setRows,
  onDelete,
}: {
  row: ThiThuDeThiItem;
  idx: number;
  readOnly: boolean;
  setRows: Dispatch<SetStateAction<ThiThuDeThiItem[]>>;
  onDelete: () => void;
}) {
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadBatch, setUploadBatch] = useState<{ cur: number; total: number } | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  /**
   * Cập nhật theo **chỉ số dòng `idx`** (khớp `items.map`), không chỉ `thu_tu` — tránh đề trùng/sai `thu_tu`
   * sau thêm–xóa đề khiến upload không gắn vào đúng hàng (nhìn như «chọn file không có gì»).
   * Dùng XHR (`onProgress`) giống ảnh cover để luôn có tiến độ.
   */
  const handleFiles = useCallback(
    async (files: File[] | null) => {
      if (!files?.length || readOnly) return;
      const rowIndex = idx;
      const list = files;
      setUploadErr(null);
      setUploadBusy(true);
      setUploadPct(1);
      setUploadBatch({ cur: 1, total: list.length });
      const urlList: string[] = [];
      try {
        for (let i = 0; i < list.length; i++) {
          const f = list[i]!;
          setUploadBatch({ cur: i + 1, total: list.length });
          const url = await uploadAdminCfImage(f, f.name, (p) => setUploadPct(p));
          urlList.push(url);
          setUploadPct(Math.round(((i + 1) / list.length) * 100));
        }
        flushSync(() => {
          setRows((prev) => {
            if (rowIndex < 0 || rowIndex >= prev.length) return prev;
            return prev.map((r, j) =>
              j === rowIndex ? { ...r, anh_urls: [...(r.anh_urls ?? []), ...urlList] } : r,
            );
          });
        });
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : "Tải ảnh thất bại.");
      } finally {
        setUploadBusy(false);
        setUploadPct(0);
        setUploadBatch(null);
      }
    },
    [idx, readOnly, setRows],
  );

  return (
    <div className="tti-de-item-w">
      <div className="tti-de-item-hd">
        <div className="tti-de-item-num">{idx + 1}</div>
        <input
          className="tti-f-in min-w-0 flex-1"
          placeholder="Tiêu đề đề thi"
          readOnly={readOnly}
          value={row.tieu_de}
          onChange={(e) => {
            const v = e.target.value;
            const j = idx;
            setRows((prev) => prev.map((r, i) => (i === j ? { ...r, tieu_de: v } : r)));
          }}
        />
        <button type="button" className="tti-de-del flex-shrink-0" onClick={onDelete} disabled={readOnly}>
          Xóa đề
        </button>
      </div>

      <div className="tti-de-img-block">
        <p className="mb-1 text-[12px] font-bold text-[#2d2020]">Ảnh đề</p>

        {!readOnly ? (
          <div>
            <span className="mb-1 block text-[11px] font-bold text-[#2d2020]">Chọn file từ máy</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadBusy}
              className="tti-de-plain-file max-w-full"
              aria-label={`Chọn ảnh đề ${idx + 1}`}
              onChange={(e) => {
                const input = e.target;
                /** Chụp `File[]` ngay — `FileList` gắn input, sau `value=""` có thể rỗng trước khi async chạy (im lặng, không upload). */
                const picked = input.files?.length ? Array.from(input.files) : [];
                input.value = "";
                if (picked.length === 0) return;
                void handleFiles(picked);
              }}
            />
            {uploadBusy ? (
              <p className="tti-de-upload-line" role="status">
                <span className="tti-spinner tti-spinner--sm mr-2 inline-block align-middle" aria-hidden />
                Đang upload…{" "}
                {uploadBatch ? `${uploadBatch.cur}/${uploadBatch.total} ảnh · ` : ""}
                {uploadPct}%
              </p>
            ) : null}
          </div>
        ) : null}

        {uploadErr ? (
          <div className="tti-upload-err-banner" role="alert">
            <strong>Lỗi.</strong> {uploadErr}
          </div>
        ) : null}

        {(row.anh_urls ?? []).length > 0 ? (
          <p className="mt-2 text-[11px] font-semibold text-[rgba(45,32,32,0.55)]">
            Xem trước ({(row.anh_urls ?? []).length} ảnh — chưa lưu DB cho đến khi lưu kỳ thi)
          </p>
        ) : null}

        <div className="tti-de-imgs">
          {(row.anh_urls ?? []).map((url, ui) => (
            <div key={`${url}-${ui}`} className="tti-de-img-th">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cfResolvedImageUrl(url, "thumb") || url}
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
                onClick={() => {
                  const j = idx;
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === j ? { ...r, anh_urls: (r.anh_urls ?? []).filter((_, k) => k !== ui) } : r,
                    ),
                  );
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Block đề thi — state do parent giữ (`thi_thu_ky_thi.de_thi` JSON).
 */
export default function ThiThuDeThiTab({ items, onChange, readOnly = false }: Props) {
  const setRows = onChange;

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
          Tiêu đề từng đề và ảnh đề — lưu chung khi bạn bấm «Lưu thông tin».
        </p>
      </div>

      {readOnly ? (
        <p className="rounded-lg border border-black/[0.08] bg-black/[0.03] px-3 py-2 text-[12px] text-[rgba(45,32,32,0.65)]">
          Bạn chỉ xem — không có quyền sửa đề thi.
        </p>
      ) : null}

      {items.map((row, idx) => (
        <DeThiRow
          key={`de-${row.thu_tu}-${idx}`}
          row={row}
          idx={idx}
          readOnly={readOnly}
          setRows={setRows}
          onDelete={() => deleteRow(idx)}
        />
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
