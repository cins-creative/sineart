"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ClipboardList, Loader2 } from "lucide-react";

import AdminMinhHoaDropzone, {
  minhHoaUrlsFromSlots,
  type MinhHoaUploadSlot,
} from "@/app/admin/_components/AdminMinhHoaDropzone";
import AdminRichTextEditor from "@/app/admin/_components/AdminRichTextEditor";
import { createMktMediaOrder } from "@/app/admin/dashboard/quan-ly-media/actions";
import { MKT_MEDIA_TYPE_OPTIONS } from "@/lib/data/mkt-media-form";
import { htmlToPlainText, sanitizeAdminRichHtml } from "@/lib/admin/sanitize-admin-html";
import { cn } from "@/lib/utils";

type Props = {
  creatorLabel: string;
  defaultStartYmd: string;
  defaultEndYmd: string;
};

function fieldLabel(text: string, required?: boolean) {
  return (
    <label className="mb-1.5 block text-[12px] font-bold text-[#555]">
      {text}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
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
  const [briefHtml, setBriefHtml] = useState<string>("");
  const [briefUploading, setBriefUploading] = useState(false);
  const [minhHoa, setMinhHoa] = useState<MinhHoaUploadSlot[]>([]);

  const inputCls = useMemo(
    () =>
      "w-full rounded-xl border border-[#EAEAEA] bg-white px-3 py-2.5 text-[13px] text-[#323232] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#f8a668] focus:ring-2 focus:ring-[#f8a668]/25",
    [],
  );

  const submit = useCallback(() => {
    setErr(null);

    if (briefUploading) {
      setErr("Đợi ảnh trong brief tải xong rồi gửi order.");
      return;
    }
    if (minhHoa.some((s) => s.uploading)) {
      setErr("Đợi ảnh minh họa tải xong rồi gửi order.");
      return;
    }
    if (minhHoa.some((s) => s.error && !s.url)) {
      setErr("Có ảnh minh họa lỗi — xóa dòng lỗi hoặc thử tải lại.");
      return;
    }

    const safeBrief = sanitizeAdminRichHtml(briefHtml).trim();
    const plainLen = htmlToPlainText(safeBrief).length;
    if (plainLen > BRIEF_MAX_PLAIN) {
      setErr(`Brief quá dài (tối đa khoảng ${BRIEF_MAX_PLAIN} ký tự nội dung).`);
      return;
    }

    const urls = minhHoaUrlsFromSlots(minhHoa);

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
  }, [
    projectName,
    projectType,
    type,
    startDate,
    endDate,
    briefHtml,
    briefUploading,
    minhHoa,
    router,
  ]);

  const isSubmitDisabled = pending || briefUploading;

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
                <select
                  className={cn(inputCls, "cursor-pointer")}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
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
                <input
                  type="date"
                  className={inputCls}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              {fieldLabel("Brief / mô tả yêu cầu")}
              <AdminRichTextEditor
                onChange={setBriefHtml}
                onUploadChange={setBriefUploading}
                placeholder="Mô tả yêu cầu, thêm ảnh bằng cách paste hoặc kéo thả…"
              />
              {briefUploading ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[#BC8AF9]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Ảnh đang được tải lên Cloudflare Images… Nút Gửi order sẽ mở khóa khi xong.
                </p>
              ) : null}
            </div>

            <div>
              {fieldLabel("Minh họa")}
              <AdminMinhHoaDropzone slots={minhHoa} setSlots={setMinhHoa} />
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800">
              {err}
            </div>
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
              disabled={isSubmitDisabled}
              onClick={submit}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(238,92,162,0.35)] transition",
                "bg-gradient-to-r from-[#F8A568] to-[#EE5CA2] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {(pending || briefUploading) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {briefUploading ? "Đợi ảnh tải…" : "Gửi order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
