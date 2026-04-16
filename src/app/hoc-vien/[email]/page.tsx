import { permanentRedirect } from "next/navigation";
import NavBar from "@/app/_components/NavBar";
import { getKhoaHocPageData } from "@/lib/data/courses-page";
import { buildKhoaHocNavFromCourses } from "@/lib/nav/build-khoa-hoc-nav";
import { createClient } from "@/lib/supabase/server";
import HocVienProfileClient from "./profile-client";

type PageProps = {
  params: Promise<{ email: string }>;
};

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export default async function HocVienProfilePage({ params }: PageProps) {
  const { email: segment } = await params;
  const decoded = decodePathSegment(segment).trim();

  if (/^\d+$/.test(decoded)) {
    const sb = await createClient();
    if (sb) {
      const { data } = await sb
        .from("ql_thong_tin_hoc_vien")
        .select("email")
        .eq("id", decoded)
        .maybeSingle();
      const row = data as { email?: string | null } | null;
      const em = row?.email != null ? String(row.email).trim().toLowerCase() : "";
      if (em.includes("@")) {
        permanentRedirect(`/hoc-vien/${encodeURIComponent(em)}`);
      }
    }
  }

  const { courses } = await getKhoaHocPageData();
  const khoaHocGroups = buildKhoaHocNavFromCourses(courses);

  return (
    <div className="sa-root khoa-hoc-page">
      <NavBar khoaHocGroups={khoaHocGroups} />
      <HocVienProfileClient profileEmail={decoded} />
    </div>
  );
}
