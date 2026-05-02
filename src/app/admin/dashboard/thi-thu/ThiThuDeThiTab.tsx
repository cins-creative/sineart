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
 * Một dòng đề — upload ảnh qua `/admin/api/upload-cf-image` (Cloudflare), URL gắn vào `anh_urls`;
 * ghi DB cột `thi_thu_ky_thi.de_thi` khi bấm «Lưu thông tin» ở form cha.
 */
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
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || readOnly) return;
      const list = Array.from(fileList);
      setUploadErr(null);
      setUploadBusy(true);
      setUploadPct(0);
      const urlList: string[] = [];
      try {
        for (let i = 0; i < list.length; i++) {
          const f = list[i]!;
          const url = await uploadAdminCfImage(f, f.name, (p) => {
            const overall = Math.round(((i + p / 100) / list.length) * 100);
            setUploadPct(Math.min(99, Math.max(0, overall)));
          });
          urlList.push(url);
        }
        setRows((prev) =>
          prev.map((r, i) =>
            i === idx ? { ...r, anh_urls: [...(r.anh_urls ?? []), ...urlList] } : r,
          ),
        );
      } catch (e) {
        setUploadErr(e instanceof Error ? e.message : "Tải ảnh thất bại.");
      } finally {
        setUploadBusy(false);
        setUploadPct(0);
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
            setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, tieu_de: v } : r)));
          }}
        />
        <button type="button" className="tti-de-del flex-shrink-0" onClick={onDelete} disabled={readOnly}>
          Xóa đề
        </button>
      </div>

      <div>
        <p className="mb-1 text-[12px] font-bold text-[#2d2020]">Ảnh đề</p>
        <p className="mb-2 text-[11px] font-semibold leading-snug text-[rgba(45,32,32,0.55)]">
          Chọn file → upload Cloudflare Images → xem trước bên dưới. Bấm «Lưu thông tin» (form kỳ thi) để ghi JSON vào cột{" "}
          <code className="rounded bg-black/[0.06] px-1 text-[10px]">de_thi</code>.
        </p>

        {!readOnly ? (
          <div className="tti-de-upload-toolbar">
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadBusy}
              className="tti-de-file-native"
              onChange={(e) => {
                const files = e.target.files;
                e.target.value = "";
                void handleFiles(files);
              }}
            />
            {uploadBusy ? (
              <p className="tti-de-upload-status" role="status">
                Đang upload… {uploadPct}%
              </p>
            ) : null}
          </div>
        ) : null}

        {uploadErr ? (
          <div className="tti-upload-err-banner" role="alert">
            <strong>Lỗi upload.</strong> {uploadErr}
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
                  setRows((prev) =>
                    prev.map((r, i) =>
                      i === idx ? { ...r, anh_urls: (r.anh_urls ?? []).filter((_, j) => j !== ui) } : r,
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
          key={`de-${idx}-${row.thu_tu}`}
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
