import { redirect } from "next/navigation";

import ReportMktView from "@/app/admin/dashboard/report-mkt/ReportMktView";
import { getAdminSessionOrNull } from "@/lib/admin/require-admin-session";
import { fetchMkDataAnalysisRows } from "@/lib/data/admin-report-mkt";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export default async function AdminReportMktPage() {
  const session = await getAdminSessionOrNull();
  if (!session) redirect("/admin");

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return (
      <div className="-m-4 bg-[#F5F7F7] px-6 py-6 font-sans text-[#323232] md:-m-6">
        <div className="mx-auto max-w-[1200px] rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          Thiếu <code className="rounded bg-red-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> — không đọc/ghi được dữ liệu.
        </div>
      </div>
    );
  }

  const res = await fetchMkDataAnalysisRows(supabase);
  if (!res.ok) {
    const isPerm = res.error.toLowerCase().includes("permission denied");
    return (
      <div className="-m-4 bg-[#F5F7F7] px-6 py-6 font-sans text-[#323232] md:-m-6">
        <div className="mx-auto max-w-[1200px] rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <p className="font-medium">Không tải được dữ liệu marketing: {res.error}</p>
        {isPerm ? (
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-red-900/90">
            <p>
              Trên project Supabase, mở <span className="font-semibold">SQL Editor</span> → dán và chạy một trong hai
              cách sau (cùng project với biến <code className="rounded bg-red-100/80 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              trong Vercel).
            </p>
            <details className="rounded-lg border border-red-200/70 bg-white/90 p-3 text-red-950">
              <summary className="cursor-pointer select-none font-semibold text-red-900">
                Cách 1 — Bảng đã có sẵn: chỉ cấp quyền (copy khối dưới)
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-[#1a1a2e] p-3 font-mono text-[11px] leading-relaxed text-emerald-100">
                {`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mk_data_analysis TO service_role;
GRANT ALL ON TABLE public.mk_data_analysis TO postgres;
NOTIFY pgrst, 'reload schema';`}
              </pre>
            </details>
            <details className="rounded-lg border border-red-200/70 bg-white/90 p-3 text-red-950">
              <summary className="cursor-pointer select-none font-semibold text-red-900">
                Cách 2 — Chưa có bảng / muốn tạo đủ cột: migration trong repo
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed">
                Chạy file{" "}
                <code className="break-all rounded bg-red-100/80 px-1">
                  supabase/migrations/20260416120000_mk_data_analysis_grants.sql
                </code>{" "}
                (tạo bảng + GRANT). Nếu bảng đã tồn tại mà vẫn lỗi, thêm file{" "}
                <code className="break-all rounded bg-red-100/80 px-1">
                  supabase/migrations/20260416123000_mk_data_analysis_grant_only.sql
                </code>{" "}
                hoặc chỉ dùng Cách 1. Deploy migration:{" "}
                <code className="rounded bg-red-100/80 px-1">supabase db push</code> (CLI).
              </p>
            </details>
          </div>
        ) : null}
        </div>
      </div>
    );
  }

  return <ReportMktView initialRows={res.rows} />;
}
