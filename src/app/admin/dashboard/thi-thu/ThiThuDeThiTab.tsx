"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import type { ThiThuDeThiRow } from "@/types/thi-thu";

type DraftRow = ThiThuDeThiRow | Omit<ThiThuDeThiRow, "id"> & { id?: string };

export default function ThiThuDeThiTab({
  kyId,
  initialRows,
}: {
  kyId: string;
  initialRows: ThiThuDeThiRow[];
}) {
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialRows.length ? initialRows : [],
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const saveRow = useCallback(
    async (row: DraftRow) => {
      const payload = {
        id: row.id,
        ky_thi_id: kyId,
        tieu_de: row.tieu_de.trim(),
        anh_urls: row.anh_urls ?? [],
        thu_tu: row.thu_tu,
      };
      setBusyId(row.id ?? "new");
      try {
        const res = await fetch("/admin/api/thi-thu-de-upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = (await res.json()) as { ok?: boolean; id?: string; error?: string };
        if (!res.ok || !j.ok) throw new Error(j.error ?? "Lưu thất bại");
        if (j.id && !row.id) {
          setRows((prev) =>
            prev.map((r) => (r === row ? ({ ...r, id: j.id } as ThiThuDeThiRow) : r)),
          );
        }
      } finally {
        setBusyId(null);
      }
    },
    [kyId],
  );

  const deleteRow = useCallback(async (id: string | undefined) => {
    if (!id) return;
    if (!window.confirm("Xóa đề này?")) return;
    setBusyId(id);
    try {
      const res = await fetch("/admin/api/thi-thu-de-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(j.error ?? "Xóa thất bại");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }, []);

  const addDe = useCallback(() => {
    const maxTu = rows.reduce((m, r) => Math.max(m, r.thu_tu), 0);
    setRows((prev) => [
      ...prev,
      {
        ky_thi_id: kyId,
        tieu_de: "",
        anh_urls: [],
        thu_tu: maxTu + 1,
      } as DraftRow,
    ]);
  }, [kyId, rows]);

  return (
    <div className="space-y-4">
      {rows.map((row, idx) => (
        <div key={row.id ?? `draft-${idx}`} className="tti-de-item-w">
          <div className="tti-de-item-hd">
            <div className="tti-de-item-num">{idx + 1}</div>
            <input
              className="tti-f-in min-w-0 flex-1"
              placeholder="Tiêu đề đề thi"
              value={row.tieu_de}
              onChange={(e) => {
                const v = e.target.value;
                setRows((p) => p.map((r, i) => (i === idx ? { ...r, tieu_de: v } : r)));
              }}
            />
            <button
              type="button"
              className="tti-de-del flex-shrink-0"
              onClick={() => void deleteRow(row.id)}
              disabled={busyId !== null}
            >
              Xóa đề
            </button>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-bold text-[#2d2020]">Ảnh đề</p>
            <label className="tti-de-add-img inline-flex cursor-pointer border border-dashed">
              + Thêm ảnh
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const urlList: string[] = [];
                  for (const f of Array.from(files)) {
                    const url = await uploadAdminCfImage(f, f.name);
                    urlList.push(url);
                  }
                  setRows((p) =>
                    p.map((r, i) =>
                      i === idx ? { ...r, anh_urls: [...(r.anh_urls ?? []), ...urlList] } : r,
                    ),
                  );
                  e.target.value = "";
                }}
              />
            </label>
            <div className="tti-de-imgs">
              {(row.anh_urls ?? []).map((url, ui) => (
                <div key={`${url}-${ui}`} className="tti-de-img-th">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="tti-de-img-x"
                    aria-label="Xóa ảnh"
                    onClick={() =>
                      setRows((p) =>
                        p.map((r, i) =>
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

          <div className="tti-de-item-ft">
            <button
              type="button"
              className="tti-save-btn tti-save-btn-sm"
              disabled={busyId !== null || !row.tieu_de.trim()}
              onClick={() => void saveRow(row)}
            >
              {busyId === (row.id ?? "new") ? (
                <Loader2 className="inline h-4 w-4 animate-spin" aria-hidden />
              ) : (
                "Lưu đề"
              )}
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="tti-de-add-new inline-flex items-center justify-center gap-2" onClick={addDe}>
        <Plus className="h-4 w-4" aria-hidden />
        Thêm đề
      </button>
    </div>
  );
}
