"use client";

import { useActionState } from "react";
import Link from "next/link";

import { AdminCfImageInput } from "@/app/admin/_components/AdminCfImageInput";
import type { KhoaHocFormState } from "@/app/admin/dashboard/khoa-hoc/actions";
import { updateKhoaHoc } from "@/app/admin/dashboard/khoa-hoc/actions";

export type EditMonRow = {
  id: number;
  ten_mon_hoc: string;
  thumbnail: string | null;
  loai_khoa_hoc: string | null;
  thu_tu_hien_thi: number;
  is_featured: boolean;
  hinh_thuc: string | null;
  si_so: number | null;
  video_gioi_thieu: string | null;
  gioi_thieu_mon_hoc: string | null;
};

type Props = { row: EditMonRow };

export default function EditMonView({ row }: Props) {
  const [state, action, pending] = useActionState(updateKhoaHoc, null as KhoaHocFormState | null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/admin/dashboard/khoa-hoc" className="text-xs font-medium text-black/45 hover:text-black/70">
          ← Danh sách khóa học
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-black/90">Sửa khóa học</h1>
        <p className="mt-1 font-mono text-xs text-black/40">#{row.id}</p>
      </div>

      <form action={action} className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <input type="hidden" name="id" value={row.id} />

        <div>
          <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="ten_mon_hoc">
            Tên môn / khóa học *
          </label>
          <input
            id="ten_mon_hoc"
            name="ten_mon_hoc"
            required
            maxLength={500}
            defaultValue={row.ten_mon_hoc}
            className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2.5 text-sm outline-none focus:border-[#f8a668]/80 focus:ring-2 focus:ring-[#f8a668]/25"
          />
        </div>

        <AdminCfImageInput label="Ảnh khóa học" name="thumbnail" defaultValue={row.thumbnail} syncKey={row.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="loai_khoa_hoc">
              Loại khóa học
            </label>
            <input
              id="loai_khoa_hoc"
              name="loai_khoa_hoc"
              maxLength={200}
              defaultValue={row.loai_khoa_hoc ?? ""}
              className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#f8a668]/80"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="thu_tu_hien_thi">
              Thứ tự hiển thị
            </label>
            <input
              id="thu_tu_hien_thi"
              name="thu_tu_hien_thi"
              type="number"
              min={0}
              max={9999}
              defaultValue={row.thu_tu_hien_thi}
              className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#f8a668]/80"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="hinh_thuc">
            Hình thức (nav / thẻ — VD: Online, Tại lớp)
          </label>
          <input
            id="hinh_thuc"
            name="hinh_thuc"
            maxLength={200}
            defaultValue={row.hinh_thuc ?? ""}
            className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#f8a668]/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="si_so">
            Sĩ số (tuỳ chọn)
          </label>
          <input
            id="si_so"
            name="si_so"
            type="text"
            inputMode="decimal"
            defaultValue={row.si_so != null ? String(row.si_so) : ""}
            placeholder="VD: 24"
            className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#f8a668]/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="video_gioi_thieu">
            Video giới thiệu môn (YouTube)
          </label>
          <input
            id="video_gioi_thieu"
            name="video_gioi_thieu"
            type="url"
            maxLength={2000}
            defaultValue={row.video_gioi_thieu ?? ""}
            placeholder="https://youtu.be/… hoặc watch?v=…"
            className="w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2 text-sm outline-none focus:border-[#f8a668]/80"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-black/50" htmlFor="gioi_thieu_mon_hoc">
            Nội dung môn học (HTML)
          </label>
          <textarea
            id="gioi_thieu_mon_hoc"
            name="gioi_thieu_mon_hoc"
            rows={12}
            defaultValue={row.gioi_thieu_mon_hoc ?? ""}
            placeholder="Để trống = 3 thẻ mặc định trên trang khóa học"
            className="min-h-[180px] w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-2 font-mono text-xs outline-none focus:border-[#f8a668]/80"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-black/70">
          <input
            type="checkbox"
            name="is_featured"
            value="true"
            defaultChecked={row.is_featured}
            className="rounded border-black/20"
          />
          Nổi bật trang chủ (featured)
        </label>

        {state?.ok === false ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok === true ? (
          <p className="text-sm text-emerald-700" role="status">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-gradient-to-r from-[#f8a668] to-[#ee5b9f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {pending ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
