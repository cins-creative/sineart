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
  const [uploadBatch, setUploadBatch] = useState<{ cur: number; total: number } | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  /** Không truyền `onProgress` → client dùng `fetch` (không XHR). Tránh lỗi proxy/trình duyệt chỉ với upload có tiến độ byte. */
  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || readOnly) return;
      const list = Array.from(fileList);
      setUploadErr(null);
      setUploadBusy(true);
      setUploadPct(1);
      setUploadBatch({ cur: 1, total: list.length });
      const urlList: string[] = [];
      try {
        for (let i = 0; i < list.length; i++) {
          const f = list[i]!;
          setUploadBatch({ cur: i + 1, total: list.length });
          const url = await uploadAdminCfImage(f, f.name);
          urlList.push(url);
          setUploadPct(Math.round(((i + 1) / list.length) * 100));
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
        setUploadBatch(null);
      }
    },
    [idx, readOnly, setRows],
  );

  const appendManualImageUrl = useCallback(() => {
    const u = manualUrl.trim();
    if (!u) return;
    if (!/^https?:\/\/.+/i.test(u)) {
      setUploadErr("URL ảnh phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setUploadErr(null);
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, anh_urls: [...(r.anh_urls ?? []), u] } : r)),
    );
    setManualUrl("");
  }, [idx, manualUrl, setRows]);

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

      <div className="tti-de-img-block">
        <p className="mb-1 text-[12px] font-bold text-[#2d2020]">Ảnh đề</p>
        <p className="mb-2 text-[11px] leading-snug text-[rgba(45,32,32,0.58)]">
          (1) Chọn file — server upload lên Cloudflare giống ảnh cover. (2) Hoặc dán URL ảnh đã có (vd. imagedelivery.net). «Lưu thông tin»
          ghi vào cột <code className="rounded bg-black/[0.06] px-1 text-[10px]">de_thi</code>.
        </p>

        {!readOnly ? (
          <div className="flex flex-col gap-3">
            <div>
              <span className="mb-1 block text-[11px] font-bold text-[#2d2020]">Chọn file từ máy</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploadBusy}
                className="tti-de-plain-file max-w-full"
                aria-label={`Chọn ảnh đề ${idx + 1}`}
                onChange={(e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  void handleFiles(files);
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

            <div>
              <span className="mb-1 block text-[11px] font-bold text-[#2d2020]">Hoặc dán URL ảnh</span>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://…"
                  value={manualUrl}
                  disabled={uploadBusy}
                  className="tti-f-in min-w-0 flex-1"
                  onChange={(e) => setManualUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      appendManualImageUrl();
                    }
                  }}
                />
                <button type="button" className="tti-save-btn-sm shrink-0 px-4 py-2" disabled={uploadBusy} onClick={appendManualImageUrl}>
                  Thêm URL
                </button>
              </div>
            </div>
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
