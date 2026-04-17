"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  Bold,
  ClipboardList,
  ImagePlus,
  Italic,
  List,
  Loader2,
  ListOrdered,
  Trash2,
  Underline,
  Upload,
} from "lucide-react";

import { createMktMediaOrder } from "@/app/admin/dashboard/quan-ly-media/actions";
import { MKT_MEDIA_TYPE_OPTIONS } from "@/lib/data/mkt-media-form";
import { htmlToPlainText, sanitizeAdminRichHtml } from "@/lib/admin/sanitize-admin-html";
import { uploadAdminCfImage } from "@/lib/admin/upload-cf-image-client";
import { cn } from "@/lib/utils";

type Props = {
  creatorLabel: string;
  defaultStartYmd: string;
  defaultEndYmd: string;
};

type MinhHoaSlot = { id: string; url: string | null; uploading: boolean; error: string | null };

function fieldLabel(text: string, required?: boolean) {
  return (
    <label className="mb-1.5 block text-[12px] font-bold text-[#555]">
      {text}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

function collectImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const byKey = new Map<string, File>();
  const add = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    const k = `${f.name}-${f.size}-${f.lastModified}`;
    if (!byKey.has(k)) byKey.set(k, f);
  };
  if (dt.files?.length) {
    for (let i = 0; i < dt.files.length; i += 1) add(dt.files.item(i));
  }
  for (let i = 0; i < dt.items.length; i += 1) {
    const it = dt.items[i];
    if (it.kind === "file") add(it.getAsFile());
  }
  return [...byKey.values()];
}

function execBriefCmd(el: HTMLDivElement | null, command: string, value?: string) {
  if (!el) return;
  el.focus();
  try {
    document.execCommand(command, false, value);
  } catch {
    /* ignore */
  }
}

const BRIEF_MAX_PLAIN = 12000;

export default function OrderMediaView({ creatorLabel, defaultStartYmd, defaultEndYmd }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [type, setType] = useState<string>(MKT_MEDIA_TYPE_OPTIONS[0] ?? "");
  const [startDate, setStartDate] = useState(defaultStartYmd);
  const [endDate, setEndDate] = useState(defaultEndYmd);
  const briefRef = useRef<HTMLDivElement>(null);
  const [minhHoa, setMinhHoa] = useState<MinhHoaSlot[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = useMemo(
    () =>
      "w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] text-[#323232] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#f8a668] focus:ring-2 focus:ring-[#f8a668]/25",
    [],
  );

  const uploadSlots = useCallback((files: File[]) => {
    for (const file of files) {
      const id = crypto.randomUUID();
      setMinhHoa((prev) => [...prev, { id, url: null, uploading: true, error: null }]);
      void uploadAdminCfImage(file, file.name || "image.png")
        .then((url) => {
          setMinhHoa((prev) =>
            prev.map((s) => (s.id === id ? { ...s, url, uploading: false, error: null } : s)),
          );
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "Lỗi tải ảnh.";
          setMinhHoa((prev) =>
            prev.map((s) => (s.id === id ? { ...s, url: null, uploading: false, error: msg } : s)),
          );
        });
    }
  }, []);

  const removeMinhHoa = useCallback((id: string) => {
    setMinhHoa((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const onPasteMinhHoa = useCallback(
    (e: React.ClipboardEvent) => {
      const files = collectImageFilesFromDataTransfer(e.clipboardData);
      if (files.length) {
        e.preventDefault();
        uploadSlots(files);
      }
    },
    [uploadSlots],
  );

  const onDropMinhHoa = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = collectImageFilesFromDataTransfer(e.dataTransfer);
      if (files.length) uploadSlots(files);
    },
    [uploadSlots],
  );

  const submit = useCallback(() => {
    setErr(null);
    const rawBrief = briefRef.current?.innerHTML ?? "";
    const safeBrief = sanitizeAdminRichHtml(rawBrief).trim();
    const plainLen = htmlToPlainText(safeBrief).length;
    if (plainLen > BRIEF_MAX_PLAIN) {
      setErr(`Brief quá dài (tối đa khoảng ${BRIEF_MAX_PLAIN} ký tự nội dung).`);
      return;
    }
    const urls = minhHoa.map((s) => s.url).filter((u): u is string => Boolean(u?.trim()));
    if (minhHoa.some((s) => s.uploading)) {
      setErr("Đợi ảnh minh họa tải xong rồi gửi order.");
      return;
    }
    if (minhHoa.some((s) => s.error && !s.url)) {
      setErr("Có ảnh minh họa lỗi — xóa dòng lỗi hoặc thử tải lại.");
      return;
    }

    startTransition(async () => {
      const res = await createMktMediaOrder({
        project_name: projectName,
        project_type: projectType.trim() || null,
        type: type.trim() || null,
        start_date: startDate,
        end_date: endDate,
        brief: safeBrief || null,
        minh_hoa: urls,
        nguoi_lam_ids: [],
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.push("/admin/dashboard/quan-ly-media");
      router.refresh();
    });
  }, [projectName, projectType, type, startDate, endDate, minhHoa, router]);

  const tbBtn =
    "rounded-lg border border-[#EAEAEA] bg-white px-2 py-1.5 text-[12px] font-semibold text-[#555] hover:bg-[#fafafa]";

  return (
    <div className="-m-4 flex min-h-[calc(100vh-5.5rem)] flex-col bg-[#F5F7F7] font-sans text-[#323232] md:-m-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAEAEA] bg-white px-6 py-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8A568] to-[#EE5CA2]">
            <ClipboardList className="text-white" size={20} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-tight text-[#323232]">Order nội dung media</div>
            <div className="text-xs text-[#AAAAAA]">
              Tạo yêu cầu mới cho team media — ghi vào{" "}
              <code className="rounded bg-black/[0.04] px-1 text-[11px]">mkt_quan_ly_media</code> (trạng thái mặc
              định: Chờ xác nhận).
            </div>
          </div>
        </div>
        <Link
          href="/admin/dashboard/quan-ly-media"
          className="shrink-0 rounded-xl border border-[#EAEAEA] bg-white px-4 py-2 text-[13px] font-semibold text-[#323232] transition hover:bg-[#fafafa]"
        >
          ← Quản lý media
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[720px] flex-1 px-[10px] py-5">
        <div className="rounded-2xl border border-[#EAEAEA] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] md:p-6">
          <div className="mb-5 rounded-xl border border-[#EAEAEA] bg-[#fafafa] px-4 py-3 text-[13px] text-[#555]">
            <span className="font-semibold text-[#323232]">Người tạo order:</span> {creatorLabel}
          </div>

          <div className="space-y-4">
            <div>
              {fieldLabel("Tên dự án / tên nội dung", true)}
              <input
                className={inputCls}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="VD: Giới thiệu khóa học — Background + sale 20%"
                maxLength={500}
                autoComplete="off"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                {fieldLabel("Loại dự án")}
                <input
                  className={inputCls}
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  placeholder="VD: Sine Art"
                  maxLength={200}
                />
              </div>
              <div>
                {fieldLabel("Định dạng (type)", true)}
                <select className={cn(inputCls, "cursor-pointer")} value={type} onChange={(e) => setType(e.target.value)}>
                  {MKT_MEDIA_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                {fieldLabel("Ngày bắt đầu", true)}
                <input
                  type="date"
                  className={inputCls}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                {fieldLabel("Ngày kết thúc", true)}
                <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              {fieldLabel("Brief / mô tả yêu cầu")}
              <div className="overflow-hidden rounded-xl border border-[#EAEAEA] bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex flex-wrap gap-1 border-b border-[#EAEAEA] bg-[#fafafa] px-2 py-1.5">
                  <button
                    type="button"
                    className={tbBtn}
                    title="In đậm"
                    onClick={() => execBriefCmd(briefRef.current, "bold")}
                  >
                    <Bold className="mx-0.5 inline h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={tbBtn}
                    title="In nghiêng"
                    onClick={() => execBriefCmd(briefRef.current, "italic")}
                  >
                    <Italic className="mx-0.5 inline h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={tbBtn}
                    title="Gạch chân"
                    onClick={() => execBriefCmd(briefRef.current, "underline")}
                  >
                    <Underline className="mx-0.5 inline h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={tbBtn}
                    title="Danh sách chấm"
                    onClick={() => execBriefCmd(briefRef.current, "insertUnorderedList")}
                  >
                    <List className="mx-0.5 inline h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={tbBtn}
                    title="Danh sách số"
                    onClick={() => execBriefCmd(briefRef.current, "insertOrderedList")}
                  >
                    <ListOrdered className="mx-0.5 inline h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <div
                  ref={briefRef}
                  contentEditable
                  suppressContentEditableWarning
                  aria-label="Brief mô tả yêu cầu"
                  className={cn(
                    "min-h-[140px] max-h-[360px] overflow-y-auto px-3 py-2.5 text-[13px] text-[#323232] outline-none",
                    "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
                  )}
                />
              </div>
            </div>

            <div>
              {fieldLabel("Minh họa")}
              <div
                tabIndex={0}
                role="region"
                aria-label="Minh họa — dán hoặc kéo thả ảnh"
                onPaste={onPasteMinhHoa}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDropMinhHoa}
                className="rounded-xl border border-dashed border-[#EAEAEA] bg-[#fafafa] px-3 py-3 outline-none transition focus:border-[#f8a668] focus:ring-2 focus:ring-[#f8a668]/25"
              >
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#EAEAEA] bg-white px-3 py-2 text-[12px] font-semibold text-[#555] hover:bg-white"
                  >
                    <Upload size={14} aria-hidden />
                    Chọn ảnh
                  </button>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#aaa]">
                    <ImagePlus size={14} aria-hidden />
                    Nhấn vào khung rồi dán
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const list = e.target.files;
                    if (list?.length) uploadSlots([...list]);
                    e.target.value = "";
                  }}
                />
                {minhHoa.length === 0 ? (
                  <p className="text-[12px] text-[#aaa]">Chưa có ảnh minh họa.</p>
                ) : (
                  <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
                    {minhHoa.map((s) => (
                      <li
                        key={s.id}
                        className="relative overflow-hidden rounded-lg border border-[#EAEAEA] bg-white"
                        style={{ aspectRatio: "4/3" }}
                      >
                        {s.url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL Cloudflare động
                          <img src={s.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#f5f5f5] text-[11px] text-[#888]">
                            {s.uploading ? (
                              <Loader2 className="h-6 w-6 animate-spin text-[#ee5ca2]" aria-label="Đang tải" />
                            ) : (
                              "Lỗi"
                            )}
                          </div>
                        )}
                        {s.error && !s.url ? (
                          <div className="absolute inset-x-0 bottom-0 bg-red-50/95 px-1 py-0.5 text-[9px] leading-tight text-red-700">
                            {s.error}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeMinhHoa(s.id)}
                          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md border border-black/10 bg-white/95 text-red-600 shadow-sm hover:bg-red-50"
                          aria-label="Xóa ảnh"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">{err}</div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/admin/dashboard/quan-ly-media"
              className="rounded-xl border border-[#EAEAEA] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#555] hover:bg-[#fafafa]"
            >
              Hủy
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(238,92,162,0.35)] transition",
                "bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Gửi order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
